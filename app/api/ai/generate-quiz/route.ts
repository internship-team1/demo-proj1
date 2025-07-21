import { NextRequest, NextResponse } from 'next/server';

// 修改API URL和调用参数
const BASE_URL = "http://154.219.127.5:8002";
const API_KEY = "sk-Coo5PgGRWbyc6M5OSIT53nRWcA7xNc25DkyP5cm6Gy5X5zlm";
const MAX_CONTENT_LENGTH = 20000; // 增加内容长度限制

export async function POST(request: NextRequest) {
  try {
    // 解析请求内容
    const body = await request.json();
    const { content, filename, fileType } = body;
    
    // 特殊处理PDF文件 - 只使用文件名，不使用内容
    const isPdf = fileType?.toLowerCase() === 'pdf' || filename?.toLowerCase().endsWith('.pdf');
    
    // 如果是PDF文件，我们将只使用文件名
    if (isPdf) {
      if (!filename) {
        throw new Error("处理PDF时需要提供文件名");
      }
      
      console.log("检测到PDF文件，将只根据文件名生成问题:", filename);
      
      // 调用AI仅基于文件名生成问题
      try {
        const result = await callPdfByFilenameOnly(filename);
        return NextResponse.json(result);
      } catch (pdfError: any) {
        console.error("PDF处理失败:", pdfError);
        throw new Error(`无法基于PDF文件名生成问题: ${pdfError.message}`);
      }
    }
    
    // 以下是非PDF文件的处理逻辑
    if (!content) {
      throw new Error("没有提供有效的内容");
    }
    
    // 简单检查内容是否包含HTML标签，如果包含，进行清理
    const hasHtmlTags = content.includes('<!DOCTYPE') || content.includes('<html') || content.includes('</html>');
    
    let cleanedContent = content;
    if (hasHtmlTags) {
      console.log("检测到HTML内容，尝试清理...");
      // 简单清理HTML标签
      cleanedContent = content
        .replace(/<\!DOCTYPE[^>]*>/gi, '')
        .replace(/<html[^>]*>/gi, '')
        .replace(/<\/html>/gi, '')
        .replace(/<head>[\s\S]*?<\/head>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ') // 移除其他HTML标签
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' '); // 规范化空白字符
    }

    // 截断文本内容，避免超过token限制
    const truncatedContent = truncateContent(cleanedContent, MAX_CONTENT_LENGTH);
    console.log(`原始内容长度: ${content.length}, 截断后长度: ${truncatedContent.length}, 包含HTML: ${hasHtmlTags}`);
    
    // 尝试不同的调用格式
    try {
      // 尝试直接调用官方OpenAI兼容格式
      console.log("尝试调用API (OpenAI兼容格式)...");
      const result = await callOpenAIFormat(truncatedContent, filename, fileType);
      return NextResponse.json(result);
    } catch (firstError: any) {
      console.error("OpenAI兼容格式调用失败:", firstError);
      
      // 尝试直接调用
      try {
        console.log("尝试直接调用API...");
        const result = await callDirectAPI(truncatedContent, filename, fileType);
        return NextResponse.json(result);
      } catch (secondError: any) {
        console.error("直接调用API也失败:", secondError);
        // 两种方法都失败，直接抛出错误
        throw new Error("所有API调用失败，无法生成测验题目");
      }
    }

  } catch (error: any) {
    console.error("生成测验失败:", error);
    // 出现任何错误，直接返回错误信息
    return NextResponse.json({
      error: error.message || "生成测验题目时出现未知错误"
    }, { status: 500 });
  }
}

// 专门处理PDF文件 - 仅基于文件名生成问题
async function callPdfByFilenameOnly(filename: string) {
  console.log("为PDF文件生成问题，仅基于文件名:", filename);
  
  const prompt = `
  你是一位教育专家，精通生成测验题。

  我有一个PDF文件，文件名为: "${filename}"
  
  请根据这个文件名猜测文件可能包含的内容和主题，然后生成5个相关的单选题来测试该主题的知识。
  每个问题必须有4个选项(A,B,C,D)，并标明正确答案。
  
  严格要求：
  1. 不要在题目或选项中提及或引用文件名
  2. 不要使用"如果"、"假设"、"可能"、"推测"、"若"等猜测性语言
  3. 直接以确定的口吻出题，就像你完全了解主题一样
  4. 不要在题目中说明你是根据文件名猜测的
  5. 生成的问题应该看起来像是基于实际内容创建的
  6. 使用中文生成所有问题和选项
  7. 确保问题与主题相关且具有教育价值
  8. 选项应该合理且有区分度，包含一个正确答案和三个合理但不正确的干扰项
  
  请以下面的JSON格式返回:
  {
    "questions": [
      {
        "question": "问题内容",
        "options": {
          "A": "选项A",
          "B": "选项B",
          "C": "选项C",
          "D": "选项D"
        },
        "answer": "正确选项的字母(A或B或C或D)"
      }
    ]
  }
  
  请确保返回格式严格符合上述JSON结构，不要添加任何额外的文字说明。`;

  const url = `${BASE_URL}/v1/chat/completions`;
  const payload = {
    model: "gemini-2.5-pro",
    messages: [
      {
        role: "system",
        content: "你是一位帮助生成测验题的助手。根据PDF文件名推测主题并创建相关问题，但不要在问题中提及文件名或使用猜测性语言。直接以肯定的语气出题。总是输出有效的JSON格式。"
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.6,
    max_tokens: 4000,
    response_format: { type: "json_object" }
  };

  const headers = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  };

  console.log("发送PDF文件名处理请求到:", url);
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });

    console.log("API响应状态:", response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API错误响应:", errorText);
      throw new Error(`调用AI API失败: ${errorText}`);
    }
    
    const data = await response.json();
    console.log("API响应数据前200字符:", JSON.stringify(data).substring(0, 200));
    
    const messageContent = data.choices?.[0]?.message?.content;
    
    if (!messageContent || messageContent.trim() === '') {
      console.log("API返回空内容");
      throw new Error("AI返回了空内容");
    }
    
    // 尝试解析JSON
    try {
      // 检查返回的是不是已经是JSON对象
      if (typeof messageContent === 'object') {
        const result = ensureValidQuestions(messageContent);
        return result;
      }
      
      // 尝试从字符串中提取和解析JSON
      let jsonContent = messageContent;
      
      // 如果包含markdown代码块，提取其中内容
      const jsonMatch = messageContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }
      
      // 解析JSON
      const parsedData = JSON.parse(jsonContent);
      return ensureValidQuestions(parsedData);
    } catch (parseError: any) {
      console.error("JSON解析错误:", parseError, "原始内容:", messageContent);
      throw new Error(`解析AI返回的JSON失败: ${parseError.message}`);
    }
  } catch (error: any) {
    console.error("处理PDF文件名失败:", error);
    throw error;
  }
}

// OpenAI兼容格式调用
async function callOpenAIFormat(content: string, filename?: string, fileType?: string) {
  // 确定是否内容包含文件名和Base64编码
  const isFileContent = content.includes("文件名:") && content.includes("Base64编码");
  
  const prompt = `
  你是一位教育专家，精通生成测验题检查学生对内容的掌握情况。
  
  请仔细阅读并理解我提供的内容，然后生成5个高质量的单选题来测试对这些内容的理解。每个问题必须有4个选项(A,B,C,D)，并标明正确答案。
  
  ${isFileContent ? `
  这是一个文件内容分析任务。请仔细分析提供的信息，包括文件名和可能的Base64编码样本。
  如果你能从文件名、类型或内容片段中识别出主题，请基于该主题创建有教育意义的问题。
  ` : `
  严格要求：
  1. 问题必须基于提供的内容，不要生成内容中未涵盖的问题
  2. 确保问题涵盖内容的关键概念和重要信息
  3. 选项应该合理且有区分度，包含一个正确答案和三个合理但不正确的干扰项
  4. 对于较短或提取质量不高的内容，请根据可用信息尽量生成相关问题
  `}
  5. 使用中文生成所有问题和选项

  ${filename ? `文件名: ${filename}${fileType ? `\n文件类型: ${fileType}` : ''}` : ''}
  
  内容:
  ${content}
  
  请以下面的JSON格式返回:
  {
    "questions": [
      {
        "question": "问题内容",
        "options": {
          "A": "选项A",
          "B": "选项B",
          "C": "选项C",
          "D": "选项D"
        },
        "answer": "正确选项的字母(A或B或C或D)"
      }
    ]
  }
  
  请确保返回格式严格符合上述JSON结构，不要添加任何额外的文字说明。`;

  try {
    const url = `${BASE_URL}/v1/chat/completions`;
    const payload = {
      model: "gemini-2.5-pro",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates quiz questions based on provided content. Always output only valid JSON. Only create questions based on the actual content provided."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 4000, // 增加token限制
      response_format: { type: "json_object" } // 强制JSON输出
    };

    const headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    };

    console.log("发送OpenAI格式请求到:", url);
    
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });

    console.log("API响应状态:", response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API错误响应:", errorText);
      throw new Error(`调用AI API失败: ${errorText}`);
    }
    
    const data = await response.json();
    console.log("API响应数据类型:", typeof data);
    console.log("API响应数据前200字符:", JSON.stringify(data).substring(0, 200));
    
    const messageContent = data.choices?.[0]?.message?.content;
    console.log("消息内容前200字符:", messageContent?.substring(0, 200) || "无内容");
    
    if (!messageContent || messageContent.trim() === '') {
      console.log("API返回空内容");
      throw new Error("AI返回了空内容");
    }
    
    // 尝试解析JSON
    try {
      // 检查返回的是不是已经是JSON对象
      if (typeof messageContent === 'object') {
        // 验证结构
        const result = ensureValidQuestions(messageContent);
        return result;
      }
      
      // 尝试从字符串中提取和解析JSON
      let jsonContent = messageContent;
      
      // 如果包含markdown代码块，提取其中内容
      const jsonMatch = messageContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }
      
      // 解析JSON
      const parsedData = JSON.parse(jsonContent);
      
      // 验证结构
      const result = ensureValidQuestions(parsedData);
      return result;
    } catch (parseError: any) {
      console.error("JSON解析错误:", parseError, "原始内容:", messageContent);
      throw new Error(`解析AI返回的JSON失败: ${parseError.message}`);
    }
  } catch (error: any) {
    console.error("调用API失败:", error);
    throw error; // 直接抛出错误，不再生成默认问题
  }
}

// 确保结果包含有效的问题数组，但不添加默认问题
function ensureValidQuestions(data: any) {
  // 确保结果有questions字段
  if (!data.questions) {
    data.questions = [];
  }
  
  // 确保questions是数组
  if (!Array.isArray(data.questions)) {
    data.questions = [];
  }
  
  // 如果问题数组为空，抛出错误
  if (data.questions.length === 0) {
    throw new Error("AI未能生成有效的测验题目");
  }
  
  return data;
}

// 直接API调用方式
async function callDirectAPI(content: string, filename?: string, fileType?: string) {
  try {
    // 确定是否内容包含Base64编码
    const isBase64Content = content.includes("Base64编码") || (content.substring(0, 100).match(/^[A-Za-z0-9+/=]+$/));
    
    const prompt = `
    You are an education expert. Your task is to generate quiz questions based ONLY on the provided content.
    
    ${isBase64Content ? `
    This is a file content analysis task. The content may include file information and possibly a Base64 encoded sample.
    If you can identify a topic or subject from the filename, file type, or content, please create educational questions on that topic.
    
    For example, if it's a PDF about "Introduction to Computer Science", create questions about basic computer science concepts.
    If it's a PowerPoint about "World War II", create history questions related to that period.
    ` : `
    Read and analyze the following content carefully, then create 5 high-quality multiple choice questions with 4 options each (A, B, C, D) to test understanding of this content.
    
    Important requirements:
    1. Questions MUST be based ONLY on the provided content
    2. Do NOT generate questions based on filenames or file descriptions
    3. Ensure questions cover key concepts and important information from the content
    4. Each question should have one correct answer and three plausible but incorrect distractors
    `}
    5. Output all questions and options in Chinese
    
    ${filename ? `文件名: ${filename}${fileType ? `\n文件类型: ${fileType}` : ''}` : ''}
    
    内容:
    ${content}
    
    Return in this JSON format:
    {
      "questions": [
        {
          "question": "question text",
          "options": {
            "A": "option A",
            "B": "option B",
            "C": "option C",
            "D": "option D"
          },
          "answer": "correct option letter"
        }
      ]
    }
    
    Only return valid JSON without any other text or explanations.`;

    const url = `${BASE_URL}/v1/chat/completions`;
    const payload = {
      model: "gemini-2.5-pro",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates quiz questions based on provided content. Always output valid JSON, following strictly the required format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000 // 增加token限制
    };

    const headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    };

    console.log("发送直接API请求到:", url);
    
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000) // 增加超时时间到60秒
    });

    console.log("API响应状态:", response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API错误响应:", errorText);
      throw new Error(`调用AI API失败: ${errorText}`);
    }
    
    const data = await response.json();
    console.log("API响应数据前200字符:", JSON.stringify(data).substring(0, 200));
    
    const messageContent = data.choices?.[0]?.message?.content;
    
    if (!messageContent || messageContent.trim() === '') {
      console.log("API返回空内容");
      throw new Error("AI返回了空内容");
    }
    
    // 尝试解析JSON
    try {
      // 尝试解析JSON
      let jsonContent = messageContent;
      const jsonMatch = messageContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                        messageContent.match(/(\{[\s\S]*\})/);
      
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }
      
      const result = JSON.parse(jsonContent);
      
      // 验证结构
      return ensureValidQuestions(result);
    } catch (parseError) {
      console.error("解析返回数据失败:", parseError, "原始内容:", messageContent);
      
      // 手动从文本中提取问题和答案
      try {
        const questions = [];
        const regex = /(\d+)[\.|\)]?\s*([^\n]+)\n+\s*A[\.|\)]?\s*([^\n]+)\n+\s*B[\.|\)]?\s*([^\n]+)\n+\s*C[\.|\)]?\s*([^\n]+)\n+\s*D[\.|\)]?\s*([^\n]+)\n+[^A-D]*([A-D])/g;
        let match;
        
        while ((match = regex.exec(messageContent)) !== null) {
          questions.push({
            question: match[2].trim(),
            options: {
              "A": match[3].trim(),
              "B": match[4].trim(),
              "C": match[5].trim(),
              "D": match[6].trim()
            },
            answer: match[7].trim()
          });
        }
        
        if (questions.length > 0) {
          return ensureValidQuestions({ questions });
        }
        
        // 如果没有提取到问题，抛出错误
        throw new Error("无法从AI响应中提取有效问题");
      } catch (extractError) {
        console.error("无法从文本提取问题:", extractError);
        throw new Error("无法从AI响应中提取有效问题");
      }
    }
  } catch (error) {
    console.error("直接API调用失败:", error);
    throw error; // 直接抛出错误，不再生成默认问题
  }
}

// 截断文本内容，避免超过token限制
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }
  
  // 保留开头和结尾的内容，中间部分用省略号代替
  const frontPart = content.substring(0, Math.floor(maxLength * 0.6));
  const endPart = content.substring(content.length - Math.floor(maxLength * 0.3));
  
  return `${frontPart}\n\n...(内容太长，已截断)...\n\n${endPart}`;
}