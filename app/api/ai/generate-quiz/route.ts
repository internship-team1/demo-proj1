import { NextRequest, NextResponse } from 'next/server';

// 修改API URL和调用参数
const BASE_URL = "https://token.geminiapi.top";
const API_KEY = "sk-gNbGnpLdWo1tETWdUwCJcRUdwQS6AXHUSjDTvafYGkgW4Ik9";
const MAX_CONTENT_LENGTH = 4000; // 进一步减小内容长度

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();
    
    if (!content) {
      return NextResponse.json({ error: "文件内容不能为空" }, { status: 400 });
    }

    // 检查内容是否是PDF文件的描述
    const isPDFDescription = content.includes('这是一个PDF文件') || content.includes('这是一个文档文件');
    
    // 截断文本内容，避免超过token限制
    const truncatedContent = truncateContent(content, MAX_CONTENT_LENGTH);
    console.log(`原始内容长度: ${content.length}, 截断后长度: ${truncatedContent.length}, 是否是PDF描述: ${isPDFDescription}`);
    
    // 尝试不同的调用格式
    try {
      // 尝试直接调用官方OpenAI兼容格式
      console.log("尝试调用API (OpenAI兼容格式)...");
      const result = await callOpenAIFormat(truncatedContent);
      return NextResponse.json(result);
    } catch (firstError: any) {
      console.error("OpenAI兼容格式调用失败:", firstError);
      
      // 尝试直接调用
      try {
        console.log("尝试直接调用API...");
        const result = await callDirectAPI(truncatedContent);
        return NextResponse.json(result);
      } catch (secondError: any) {
        console.error("直接调用API也失败:", secondError);
        return NextResponse.json({ error: "所有API调用方式都失败", details: secondError.message }, { status: 500 });
      }
    }

  } catch (error: any) {
    console.error("生成测验失败:", error);
    return NextResponse.json({ error: "生成测验失败", details: error.message }, { status: 500 });
  }
}

// OpenAI兼容格式调用
async function callOpenAIFormat(content: string) {
  const prompt = `
  你是一位教育专家，精通生成测验题检查学生对内容的掌握情况，现在请你阅读并理解我上传的文件，使用中文生成5个单选题，每个问题有4个选项(A,B,C,D)，并标明正确答案。
  
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

  const url = `${BASE_URL}/v1/chat/completions`;
  const payload = {
    model: "gemini-2.5-pro",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that generates quiz questions based on provided content. Always output only valid JSON."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.5,
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
      return messageContent;
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
    
    // 验证格式
    if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
      throw new Error("返回的数据格式不符合预期");
    }
    
    return parsedData;
  } catch (parseError: any) {
    console.error("JSON解析错误:", parseError, "原始内容:", messageContent);
    throw new Error(`解析AI返回的JSON失败: ${parseError.message}`);
  }
}

// 直接API调用方式
async function callDirectAPI(content: string) {
  // 简化提示，使用简单英文提示以避免多语言处理问题
  const prompt = `
  Generate 5 multiple choice questions with 4 options each (A, B, C, D) based on the following content:
  
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
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 2000
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
    signal: AbortSignal.timeout(30000) // 30秒超时
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
  
  // 为防止解析失败，直接构造题目对象
  try {
    // 尝试解析JSON
    let jsonContent = messageContent;
    const jsonMatch = messageContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                      messageContent.match(/(\{[\s\S]*\})/);
    
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    }
    
    const result = JSON.parse(jsonContent);
    
    if (!result.questions || !Array.isArray(result.questions)) {
      throw new Error("返回的数据格式不符合预期");
    }
    
    return result;
  } catch (parseError) {
    console.error("解析返回数据失败:", parseError, "原始内容:", messageContent);
    
    // 手动从文本中提取问题和答案
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
      return { questions };
    }
    
    throw new Error("无法从响应中提取问题");
  }
}

// 截断文本内容，避免超过token限制
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }
  
  // 如果是PDF描述文件，保留全部内容，因为已经很短
  if (content.includes('这是一个PDF文件') || content.includes('这是一个文档文件')) {
    return content;
  }
  
  // 保留开头和结尾的内容，中间部分用省略号代替
  const frontPart = content.substring(0, Math.floor(maxLength * 0.6));
  const endPart = content.substring(content.length - Math.floor(maxLength * 0.3));
  
  return `${frontPart}\n\n...(内容太长，已截断)...\n\n${endPart}`;
}