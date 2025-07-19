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
      // 处理PowerPoint文件
      else if (fileExtension === '.pptx') {
        try {
          console.log("开始处理PPTX文件...");
          let pptContent = "";
          
          try {
            // 使用adm-zip解压并提取PPTX内容
            console.log("尝试使用adm-zip解压PPTX");
            const AdmZip = await import('adm-zip').then(m => m.default || m);
            
            if (!AdmZip) {
              throw new Error("无法导入adm-zip库");
            }
            
            extractDir = path.join(TEMP_DIR, `pptx_${Date.now()}`);
            await mkdir(extractDir, { recursive: true });
            
            console.log(`创建提取目录: ${extractDir}`);
            const zip = new AdmZip(tempFilePath);
            zip.extractAllTo(extractDir, true);
            console.log("PPTX文件已解压");
            
            // 查找所有幻灯片文件
            const slidesDir = path.join(extractDir, 'ppt', 'slides');
            if (fs.existsSync(slidesDir)) {
              console.log("发现幻灯片目录");
              const slideFiles = fs.readdirSync(slidesDir)
                .filter(file => file.endsWith('.xml'))
                .sort((a, b) => {
                  // 对slide1.xml, slide2.xml等进行排序
                  const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0');
                  const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0');
                  return numA - numB;
                });
              
              console.log(`发现${slideFiles.length}个幻灯片`);
              let slideContents = [];
              
              for (const slideFile of slideFiles) {
                try {
                  const slideContent = fs.readFileSync(path.join(slidesDir, slideFile), 'utf8');
                  // 提取文本内容（匹配所有<a:t>标签中的内容）
                  const textMatches = slideContent.match(/<a:t>([^<]+)<\/a:t>/g) || [];
                  const texts = textMatches.map(match => {
                    const textMatch = match.match(/<a:t>([^<]+)<\/a:t>/);
                    return textMatch ? textMatch[1].trim() : '';
                  }).filter(text => text.length > 0);
                  
                  if (texts.length > 0) {
                    slideContents.push(`幻灯片 ${slideContents.length + 1}:\n${texts.join('\n')}`);
                  }
                } catch (slideError) {
                  console.error(`处理幻灯片 ${slideFile} 失败:`, slideError);
                }
              }
              
              pptContent = slideContents.join('\n\n');
              console.log(`成功提取PowerPoint内容，长度: ${pptContent.length}`);
            } else {
              console.warn("未找到幻灯片目录:", slidesDir);
            }
            
            // 尝试从presentation.xml提取标题等信息
            try {
              const presentationFile = path.join(extractDir, 'ppt', 'presentation.xml');
              if (fs.existsSync(presentationFile)) {
                const presentationXml = fs.readFileSync(presentationFile, 'utf8');
                const titleMatch = presentationXml.match(/<a:title>([^<]+)<\/a:title>/);
                if (titleMatch && titleMatch[1]) {
                  pptContent = `标题: ${titleMatch[1]}\n\n` + pptContent;
                }
              }
            } catch (titleError) {
              console.error("提取演示文稿标题失败:", titleError);
            }
            
          } catch (zipError: any) {
            console.error("PPTX解压或解析失败:", zipError);
          }
          
          // 如果没有提取到内容，提供文件信息
          if (!pptContent || pptContent.trim().length < 20) {
            const fileInfo = `
文件名: ${fileName}
文件类型: PowerPoint演示文稿
文件大小: ${Math.round(buffer.length / 1024)} KB

无法提取PowerPoint文本内容，可能是以下原因:
1. 演示文稿可能主要包含图像而非文本
2. 演示文稿格式可能不兼容或特殊
3. 文件可能已损坏或格式错误

建议:
请检查PowerPoint文件内容是否主要为文本。
            `;
            content = fileInfo;
          } else {
            content = pptContent;
          }
        } catch (error: any) {
          console.error("PowerPoint处理失败:", error);
          content = `无法解析PowerPoint文件，原因: ${error.message || '未知错误'}。文件名: ${fileName}`;
        }
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