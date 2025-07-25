import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink, mkdir } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// 添加模块声明，避免类型错误
declare module 'pdf-parse';

declare module 'mammoth' {
  interface Result {
    value: string;
    messages: any[];
  }
  
  export function extractRawText(options: { path: string }): Promise<Result>;
}

declare module 'adm-zip';

// 临时文件目录
const TEMP_DIR = path.join(process.cwd(), 'temp');

// 确保临时目录存在
async function ensureTempDir() {
  try {
    try {
      await fs.promises.access(TEMP_DIR);
    } catch (error) {
      console.log("创建临时目录:", TEMP_DIR);
      await mkdir(TEMP_DIR, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error("临时目录创建失败:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  let tempFilePath = '';
  let extractDir = '';
  
  try {
    // 确保临时目录存在
    await ensureTempDir();
    
    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get('file');
    
    // 在服务器端环境中，我们不能使用instanceof File检查，因为File是浏览器API
    // 而是检查必要的属性是否存在
    if (!file || typeof file !== 'object' || !('name' in file) || !('arrayBuffer' in file)) {
      return NextResponse.json({ error: "未提供有效的文件" }, { status: 400 });
    }
    
    const fileName = file.name;
    const fileExtension = path.extname(fileName).toLowerCase();
    
    // 检查文件类型
    if (!['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt'].includes(fileExtension)) {
      return NextResponse.json({ 
        error: "不支持的文件类型，仅支持PDF、Word、PowerPoint和文本文件" 
      }, { status: 400 });
    }
    
    // 对于文本文件，直接读取内容
    if (fileExtension === '.txt') {
      try {
        // 确保text方法可用
        if (!('text' in file) || typeof file.text !== 'function') {
          return NextResponse.json({ error: "无法读取文本文件内容" }, { status: 500 });
        }
        const content = await file.text();
        return NextResponse.json({ content });
      } catch (txtError) {
        console.error("文本文件读取错误:", txtError);
        return NextResponse.json({ error: "无法读取文本文件" }, { status: 500 });
      }
    }
    
    // 对于非文本文件，先保存到临时目录
    // 确保arrayBuffer方法可用
    if (!('arrayBuffer' in file) || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: "无法读取文件内容" }, { status: 500 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    tempFilePath = path.join(TEMP_DIR, `temp_${Date.now()}${fileExtension}`);
    
    try {
      // 写入临时文件
      await writeFile(tempFilePath, buffer);
      
      let content = '';
      
      // 处理PDF文件
      if (fileExtension === '.pdf') {
        try {
          // 使用自定义方法解析PDF
          console.log("开始解析PDF文件...");
          let pdfText = "";
          
          try {
            // 尝试方法1: 直接使用pdf-parse但避免调用默认导出
            console.log("尝试方法1: 使用pdf-parse");
            const pdfParse = await import('pdf-parse');
            if (pdfParse && typeof pdfParse === 'object') {
              const parseFunction = pdfParse.default || pdfParse;
              if (typeof parseFunction === 'function') {
                console.log("pdf-parse导入成功，开始解析...");
                const data = await parseFunction(buffer, { 
                  // 禁用版本校验和测试文件访问
                  version: false,
                  max: 0 
                });
                pdfText = data.text || '';
                console.log(`PDF解析成功，提取了${pdfText.length}个字符`);
              }
            }
          } catch (pdfError: any) {
            console.error("PDF解析方法1失败:", pdfError);
            // 失败信息不含文件路径，避免暴露敏感信息
            pdfText = "";
          }
          
          // 如果第一种方法失败，尝试简单提取文本
          if (!pdfText || pdfText.length < 20) {
            try {
              console.log("尝试方法2: 简单提取PDF文本");
              // 简单提取PDF中可能的文本 - 这不是完美的方法，但可能提供一些内容
              const pdfString = buffer.toString('utf8', 0, Math.min(buffer.length, 10000));
              const textFragments = pdfString.match(/\(([^\)]{2,})\)/g) || [];
              if (textFragments.length > 0) {
                const extractedText = textFragments
                  .map(fragment => fragment.replace(/^\(|\)$/g, ''))
                  .filter(text => /[\u4e00-\u9fa5a-zA-Z0-9]/.test(text)) // 仅保留包含字母、数字或中文的文本
                  .join(' ');
                if (extractedText.length > pdfText.length) {
                  pdfText = extractedText;
                }
              }
            } catch (simpleError) {
              console.error("简单PDF提取失败:", simpleError);
            }
          }
          
          // 检查内容是否有效
          if (!pdfText || pdfText.trim().length < 20) {
            // 如果仍无内容，则使用文件名生成一些基本信息
            const fileInfo = `
文件名: ${fileName}
文件类型: PDF文档
文件大小: ${Math.round(buffer.length / 1024)} KB

无法提取PDF文本内容，可能是以下原因:
1. 文档可能是扫描件或图片PDF
2. 文档可能有复杂格式或加密
3. 文档可能有特殊字符集

建议:
请检查PDF文件是否包含可选择的文本内容。
            `;
            content = fileInfo;
          } else {
            content = pdfText;
          }
        } catch (error: any) {
          console.error("PDF处理失败:", error);
          content = `无法解析PDF文件，原因: ${error.message || '未知错误'}。文件名: ${fileName}`;
        }
      }
      // 处理Word文档
      else if (fileExtension === '.doc' || fileExtension === '.docx') {
        try {
          console.log("开始处理Word文档...");
          let docText = "";
          
          try {
            // 尝试方法1: 使用mammoth
            console.log("尝试使用mammoth提取文本");
            const mammoth = await import('mammoth');
            
            if (mammoth && typeof mammoth === 'object') {
              const extractFunction = mammoth.extractRawText || (mammoth.default && mammoth.default.extractRawText);
              
              if (typeof extractFunction === 'function') {
                console.log("mammoth导入成功，开始解析...");
                const result = await extractFunction({ path: tempFilePath });
                docText = result.value || '';
                console.log(`Word文档解析成功，提取了${docText.length}个字符`);
              } else {
                console.warn("mammoth.extractRawText不是函数");
              }
            } else {
              console.warn("mammoth导入失败");
            }
          } catch (mammothError: any) {
            console.error("Word解析方法1失败:", mammothError);
            docText = "";
          }
          
          // 如果mammoth失败，尝试简单提取
          if (!docText || docText.length < 20) {
            try {
              console.log("尝试方法2: 直接读取Word文件");
              // 对于较新的.docx格式(实际是ZIP文件)，尝试提取document.xml
              if (fileExtension === '.docx') {
                const AdmZip = await import('adm-zip').then(m => m.default || m);
                
                if (AdmZip) {
                  const zip = new AdmZip(tempFilePath);
                  const documentXml = zip.getEntry('word/document.xml');
                  
                  if (documentXml) {
                    const xmlContent = documentXml.getData().toString('utf8');
                    // 提取<w:t>标签中的文本内容
                    const textMatches = xmlContent.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
                    const texts = textMatches.map((match: string) => {
                      const textMatch = match.match(/<w:t[^>]*>([^<]+)<\/w:t>/);
                      return textMatch ? textMatch[1].trim() : '';
                    }).filter((text: string) => text.length > 0);
                    
                    if (texts.length > 0) {
                      docText = texts.join(' ');
                      console.log(`直接提取Word XML成功，长度: ${docText.length}`);
                    }
                  }
                }
              }
            } catch (directError) {
              console.error("Word直接提取失败:", directError);
            }
          }
          
          // 检查内容是否有效
          if (!docText || docText.trim().length < 20) {
            const fileInfo = `
文件名: ${fileName}
文件类型: Word文档
文件大小: ${Math.round(buffer.length / 1024)} KB

无法提取Word文档内容，可能是以下原因:
1. 文档可能包含大量图片或特殊格式
2. 文档可能为旧版.doc格式，提取支持有限
3. 文档可能已损坏或加密

建议:
尝试另存为纯文本格式后重新上传。
            `;
            content = fileInfo;
          } else {
            content = docText;
          }
        } catch (error: any) {
          console.error("Word处理失败:", error);
          content = `无法解析Word文档，原因: ${error.message || '未知错误'}。文件名: ${fileName}`;
        }
      }
      // 处理PowerPoint文件 - 简化逻辑，只返回基本信息，题目生成由题库处理
      else if (fileExtension === '.ppt' || fileExtension === '.pptx') {
        console.log(`处理PowerPoint文件: ${fileExtension} - 使用题库模式`);
        
        content = `
文件名: ${fileName}
文件类型: PowerPoint演示文稿 (${fileExtension}格式)
文件大小: ${Math.round(buffer.length / 1024)} KB

PowerPoint文件已上传成功。系统将从创新课程题库中为您生成相关测验题目。

题库包含丰富的创新思维、技术发展、产品设计等相关题目，
能够有效测试学员对创新理念和方法的理解掌握情况。
        `;
      }
      // 其他文件类型
      else {
        content = `文件 "${fileName}" (类型: ${fileExtension}) 的内容提取暂不可用。`;
      }
      
      // 确保内容不为空
      if (!content || content.trim().length === 0) {
        content = `无法从文件 "${fileName}" 中提取有效内容。`;
      }
      
      // 返回内容
      return NextResponse.json({ content });
      
    } catch (error: any) {
      console.error("文件处理错误:", error);
      return NextResponse.json({ 
        error: "处理文件失败", 
        details: error.message || '未知错误',
        content: `无法处理文件 "${fileName}"。错误: ${error.message || '未知错误'}`
      }, { status: 200 }); // 返回200以便前端可以显示错误信息
    }
    
  } catch (error: any) {
    console.error("请求处理错误:", error);
    return NextResponse.json({ 
      error: "请求处理失败", 
      details: error.message || '未知错误' 
    }, { status: 500 });
  } finally {
    // 清理临时文件
    try {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        await unlink(tempFilePath).catch(() => {});
      }
      if (extractDir && fs.existsSync(extractDir)) {
        fs.rmSync(extractDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.error("清理临时文件失败:", cleanupError);
    }
  }
} 