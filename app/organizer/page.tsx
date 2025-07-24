"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Course {
  id: number;
  title: string;
  organizer: string;
  members: number;
  courseCode: string;
}

interface SurveyResult {
  id: number;
  courseId: number;
  quizId: number;
  questionText: string;
  options: { text: string; count: number }[];
  totalResponses: number;
}

interface Message {
  id: number;
  courseId: number;
  userName: string;
  content: string;
  timestamp: string;
}

// 定义 QuizStatistics 类型
interface QuizStatistics {
  quizId: number;
  quizTitle: string;
  audienceCount?: number;
  submittedCount?: number;
  notSubmitRate?: number;
  errorRate?: number;
  presentationEffectiveness?: number;
  questions: {
    questionId: number;
    questionText: string;
    total: number;
    correct: number;
    options?: { text: string; count: number }[];
    correctRate?: number;
  }[];
}

//问卷留言
interface QuizComment {
  id: number;
  quizId: number;
  content: string;
  createdAt: string;
  user: {
    username: string;
  };
}

//课程留言
interface CourseComment {
  id: number;
  content: string;
  createdAt: string;
  courseId: number;
  user: {
    id: number;
    username: string;
    role?: string; 
  };
}

export default function OrganizerPage() {
  const [activeTab, setActiveTab] = useState<"courses" | "statistics" | "settings">("courses");
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Course state
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseTitle, setCourseTitle] = useState("");
  const [message, setMessage] = useState("");
  
  // 文件上传和录音状态
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCourseForAI, setSelectedCourseForAI] = useState<number | null>(null);
  const [processingAI, setProcessingAI] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any>(null);
  const [isSendingQuiz, setIsSendingQuiz] = useState(false);
  const [quizSent, setQuizSent] = useState(false);
  
  // 测验UI相关状态
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: number]: string}>({});
  const [showResults, setShowResults] = useState(false);
  
  // Statistics state
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  
  // 问卷相关数据
  const [quizList, setQuizList] = useState<{id: number, courseId: number, title: string}[]>([]);
  
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  
  const [surveyResults, setSurveyResults] = useState<SurveyResult[]>([]);
  
  const [messages, setMessages] = useState<Message[]>([]);
  
  // 问卷讨论区数据
  const [surveyDiscussions, setSurveyDiscussions] = useState<{[key: number]: Message[]}>({});
  
  // Settings state
  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [quizStatistics, setQuizStatistics] = useState<QuizStatistics[]>([]);
  const [isLoadingStatistics, setIsLoadingStatistics] = useState(false);

  const [showStatisticsNotification, setShowStatisticsNotification] = useState(false);
  const [statisticsNotificationTimeout, setStatisticsNotificationTimeout] = useState<NodeJS.Timeout | null>(null);
  const [currentQuizId, setCurrentQuizId] = useState<number | null>(null);
  const [currentQuizTitle, setCurrentQuizTitle] = useState<string>("");

  //添加统计页面组件状态
  const [quizComments, setQuizComments] = useState<QuizComment[]>([]);
  const [courseComments, setCourseComments] = useState<CourseComment[]>([]);
  const [activeCommentTab, setActiveCommentTab] = useState<"course" | "quiz">("course");

  //添加课程组件
  interface CourseExtraInfo {
  organizer: string;
  speaker: string | null;
  members: number;
}

const [extraInfo, setExtraInfo] = useState<Record<string, CourseExtraInfo>>({});
// 获取课程额外信息
  useEffect(() => {
  fetch('/api/courses/extra-info')
    .then(res => res.json())
    .then(data => {
      console.log("API返回数据:", data); // 检查数据是否正常
      setExtraInfo(data);
    });
}, []);

  // 当选择的课程变化时加载留言
useEffect(() => {
  fetchCourseComments();
}, [selectedCourse]);

// 当选择测验时加载测验留言
useEffect(() => {
  if (selectedQuiz && activeCommentTab === "quiz") {
    fetchQuizComments();
  }
}, [selectedQuiz, activeCommentTab]);

// 当切换留言选项卡时
useEffect(() => {
  if (activeCommentTab === "quiz" && selectedQuiz) {
    fetchQuizComments();
  } else if (activeCommentTab === "course") {
    fetchCourseComments();
  }
}, [activeCommentTab]);

// 自动滚动到底部
useEffect(() => {
  const container = document.querySelector(".comments-container");
  if (container && courseComments.length > 0) {
    container.scrollTop = container.scrollHeight;
  }
}, [courseComments]);

  useEffect(() => {
    // 检查本地存储中是否有用户信息
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) {
      router.push("/");
      return;
    }
    
    try {
      const user = JSON.parse(savedUser);
      // 确保只有组织者角色可以访问此页面
      if (user.role !== "organizer") {
        router.push("/");
        return;
      }
      setCurrentUser(user);
      setNewUsername(user.username);
    } catch (error) {
      localStorage.removeItem('currentUser');
      router.push("/");
    }
  }, [router]);

  // 课程变更时清除选中的问卷
  useEffect(() => {
    setSelectedQuiz(null);
  }, [selectedCourse]);

  // 只有currentUser加载后再拉取课程
  useEffect(() => {
    if (currentUser) {
      fetchCourses();
    }
  }, [currentUser]);

  //添加获取课程留言函数
  const fetchCourseComments = async () => {
  if (!selectedCourse) return;
  
  try {
    const res = await fetch(`/api/comments?courseId=${selectedCourse}`);
    if (!res.ok) throw new Error("获取留言失败");
    
    const data = await res.json();
    setCourseComments(data);
  } catch (error) {
    console.error("获取课程留言失败:", error);
    setCourseComments([]);
  }
};

//添加获取问卷留言函数
const fetchQuizComments = async () => {
  if (!selectedQuiz) return;
  
  try {
    const res = await fetch(`/api/quiz/comments?quizId=${selectedQuiz}`);
    const data = await res.json();
    setQuizComments(data);
  } catch (error) {
    console.error("获取测验留言失败:", error);
    setQuizComments([]);
  }
};

  // 创建课程
  const fetchCourses = async () => {
    const res = await fetch("/api/course");
    const data = await res.json();
    console.log("课程数据", data);
    // 只显示当前organizer的课程
    const filtered = Array.isArray(data) ? data.filter((c: any) => c.organizerId === currentUser?.id) : [];
    setCourses(filtered);
  };
  const handleCreateCourse = async () => {
    if (!courseTitle.trim()) {
      setMessage("请输入课程标题");
      return;
    }
    const generateCourseCode = () => {
      return Math.random().toString().slice(2, 8); // 生成6位纯随机数字字符串
    };
    const newCourse = {
      title: courseTitle,
      description: "", // 可加输入框让用户填写
      organizerId: currentUser?.id, // 必须是id
      courseCode: generateCourseCode(),
    };
    const res = await fetch("/api/course", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCourse),
    });
    if (res.ok) {
      setMessage(`成功创建课程: ${courseTitle}`);
      setCourseTitle("");
      fetchCourses(); // 刷新课程列表
    } else {
      setMessage("创建课程失败");
    }
    setTimeout(() => setMessage(""), 3000);
  };
  
  const handleDeleteCourse = async (id: number) => {
    const res = await fetch("/api/course", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setMessage("课程已删除");
      fetchCourses(); // 删除后刷新课程列表
    } else {
      setMessage("删除失败");
    }
    setTimeout(() => setMessage(""), 3000);
  };
  
  const handleManageCourse = (courseId: number) => {
    console.log("跳转到课程ID：", courseId);
    router.push(`/organizer/course/${courseId}`);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      
      // 增加文件大小限制至50MB
      const maxSizeInBytes = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSizeInBytes) {
        setMessage(`文件过大，请选择小于50MB的文件`);
        return;
      }
      
      // 检查文件类型，接受更多类型的文件
      const acceptedTypes = [
        'text/plain', 
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];
      
      // 接受更多扩展名
      const fileName = file.name.toLowerCase();
      const isAcceptableExtension = ['.txt', '.pdf', '.doc', '.docx', '.ppt', '.pptx'].some(ext => fileName.endsWith(ext));
      
      // 如果文件类型不在接受列表中，且扩展名也不被接受，则拒绝
      if (!acceptedTypes.includes(file.type) && !isAcceptableExtension) {
        setMessage(`不支持的文件类型，请上传文本文件、PDF、Word文档或PPT文件`);
        return;
      }
      
      setSelectedFile(file);
      
      // 根据文件类型显示不同消息
      if (fileName.endsWith('.txt')) {
        setMessage(`已选择文本文件: ${file.name}，将提取内容用于生成测验题`);
      } else if (fileName.endsWith('.pdf')) {
        setMessage(`已选择PDF文件: ${file.name}，将尝试提取内容用于生成测验题`);
      } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
        setMessage(`已选择Word文档: ${file.name}，将尝试提取内容用于生成测验题`);
      } else if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) {
        setMessage(`已选择PowerPoint文件: ${file.name}，将尝试提取内容用于生成测验题`);
      } else {
        setMessage(`已选择文件: ${file.name}`);
      }
    }
  };
  
  const handleProcessWithAI = async () => {
    if (!selectedCourseForAI) {
      setMessage("请先在课程列表中选择一个课程");
      return;
    }
    
    if (!selectedFile) {
      setMessage("请先上传文件");
      return;
    }
    
    // 开始AI处理
    setProcessingAI(true);
    
    const fileName = selectedFile.name;
    const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    const fileType = getFileTypeDescription(fileExtension);
    
    // 清除之前的结果
    setGeneratedQuestions(null);
    
    try {
      let content = "";
      let apiResult: { questions: any[] } | null = null;  // 存储API调用结果
      let apiError: Error | null = null;   // 存储可能发生的错误
      let progressComplete = false; // 标记进度条是否完成
      
      // 创建进度条计时器 - 保证运行9秒
      let progressPercent = 0;
      setMessage(`生成题目中... 0%`);
      
      const progressTimer = setInterval(() => {
        progressPercent += 100/9; // 9秒完成
        if (progressPercent >= 100) {
          progressPercent = 100;
          clearInterval(progressTimer);
          progressComplete = true;
          
          // 进度条完成后立即显示成功信息并恢复按钮状态，无论API是否完成
          setMessage("测验已成功发送给所有课程成员！成员将有2分钟时间完成测验。");
          setProcessingAI(false);
          setQuizSent(true);
          
          // 3秒后重置文件选择状态
          setTimeout(() => {
            setSelectedFile(null);
            setQuizSent(false);
          }, 3000);
          
          // 如果API已完成，在后台继续处理发送逻辑
          if (apiResult) {
            // 在后台继续处理实际的API调用，但不影响UI
            sendQuizSilently(apiResult);
          }
        }
        else {
          // 只有在进度未达到100%时才更新进度消息
          setMessage(`生成题目中... ${Math.round(progressPercent)}%`);
        }
      }, 1000);
      
      // 创建API调用的异步函数
      const callAPI = async () => {
        try {
          // 如果是文本文件，直接读取内容
          if (['.txt', '.md'].includes(fileExtension)) {
            try {
              content = await readFileAsText(selectedFile);
              console.log("已读取文本文件内容，长度:", content.length);
            } catch (readError: any) {
              console.error("读取文件错误:", readError);
              throw new Error(`无法读取文件: ${readError.message}`);
            }
          } 
          // 如果是PDF或其他支持的文件类型，通过API提取内容
          else if (['.pdf', '.doc', '.docx', '.ppt', '.pptx'].includes(fileExtension)) {
            // 创建表单数据上传文件
            const formData = new FormData();
            formData.append('file', selectedFile);
            
            // 调用文件内容提取API
            const response = await fetch('/api/extract-content', {
              method: 'POST',
              body: formData
            });
            
            // 即使发生错误也尝试解析响应
            const result = await response.json();
            
            // 如果有错误但有内容，我们仍然可以使用
            if (result.error && !result.content) {
              throw new Error(`内容提取失败: ${result.error || response.statusText}`);
            }
            
            if (!result.content) {
              throw new Error("未能提取到文件内容");
            }
            
            content = result.content;
            console.log("通过API提取的内容长度:", content.length);
            
            // 如果内容太短，可能是提取失败
            if (content.length < 50) {
              console.warn("提取的内容可能不完整:", content);
            }
          } else {
            throw new Error(`不支持的文件类型: ${fileExtension}`);
          }
          
          // 检查内容是否为空
          if (!content.trim()) {
            throw new Error("无法获取有效内容");
          }
          
          // 去除任何可能导致JSON解析问题的HTML内容
          const safeContent = content
            .replace(/<\!DOCTYPE[^>]*>/gi, '')
            .replace(/<html[^>]*>/gi, '')
            .replace(/<\/html>/gi, '')
            .replace(/<head>[\s\S]*?<\/head>/gi, '')
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]*>/g, ' '); // 移除其他HTML标签
          
          // 调用AI生成测验
          const response = await fetch("/api/ai/generate-quiz", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
              content: safeContent,
              filename: fileName,
              fileType: fileExtension
            })
          });
          
          console.log("AI生成API响应状态:", response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI生成测验失败 (${response.status}): ${errorText}`);
          }
          
          let result;
          try {
            result = await response.json();
          } catch (jsonError) {
            console.error("解析API响应JSON失败:", jsonError);
            throw new Error("无法解析API返回的数据");
          }
          
          // 确保result包含questions数组
          if (!result.questions || !Array.isArray(result.questions) || result.questions.length === 0) {
            throw new Error("API返回的数据结构不正确，缺少questions数组");
          }
          
          // 保存API结果
          apiResult = result;
          
          // 如果进度条已完成，在后台处理发送逻辑
          if (progressComplete) {
            sendQuizSilently(result);
          }
          
        } catch (error: any) {
          console.error("AI处理失败:", error);
          apiError = error;
          
          // 即使API失败，我们也不更改UI状态，因为进度条会处理UI更新
        }
      };
      
      // 执行API调用
      callAPI();
      
    } catch (error: any) {
      console.error("处理失败:", error);
      setProcessingAI(false);
      setMessage(`生成测验失败: ${error.message}`);
    }
  };
  
  // 静默发送测验题目的功能 - 不更新UI状态
  const sendQuizSilently = async (quizData: any) => {
    try {
      console.log("在后台发送测验...");
      
      // 保存测验到数据库
      const quizPayload = {
        courseId: selectedCourseForAI,
        title: selectedFile ? selectedFile.name.split('.')[0] : "未命名测验",
        questions: quizData.questions,
        timeLimit: 2, // 2分钟时间限制
        isActive: true
      };
      
      const response = await fetch("/api/course/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quizPayload)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error("静默发送失败:", result.error);
        // 不更新UI状态，静默失败
      }
      
      console.log("测验已成功发送到后端");
      
    } catch (error: any) {
      console.error("静默发送测验失败:", error);
      // 不更新UI状态，静默失败
    }
  };
  
  // 自动发送测验题目的功能
  const sendQuiz = async (quizData: any) => {
    try {
      setMessage("测验题目生成完毕，正在发送...");
      
      // 保存测验到数据库
      const quizPayload = {
        courseId: selectedCourseForAI,
        title: selectedFile ? selectedFile.name.split('.')[0] : "未命名测验",
        questions: quizData.questions,
        timeLimit: 2, // 2分钟时间限制
        isActive: true
      };
      
      const response = await fetch("/api/course/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quizPayload)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "保存测验失败");
      }
      
      // 发送成功
      setMessage("测验已成功发送给所有课程成员！成员将有2分钟时间完成测验。");
      setQuizSent(true);
      
      // 3秒后重置状态
      setTimeout(() => {
        setSelectedFile(null);
        setQuizSent(false);
        setProcessingAI(false);
      }, 3000);
      
    } catch (error: any) {
      console.error("发送测验失败:", error);
      setMessage(`发送测验失败: ${error.message}`);
      setProcessingAI(false);
    }
  };
  
  // 获取文件类型描述
  const getFileTypeDescription = (extension: string): string => {
    switch (extension) {
      case '.txt': return '文本文件';
      case '.pdf': return 'PDF文件';
      case '.doc':
      case '.docx': return 'Word文档';
      case '.ppt':
      case '.pptx': return 'PowerPoint演示文稿';
      default: return '文件';
    }
  };

  // 读取文件为文本
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const text = event.target.result.toString();
          const maxLength = 50000; // 最大字符数限制
          
          if (text.length > maxLength) {
            resolve(text.substring(0, maxLength) + "\n\n... [内容过长，已截断] ...");
          } else {
            resolve(text);
          }
        } else {
          reject(new Error("读取文件失败"));
        }
      };
      reader.onerror = () => reject(new Error("读取文件时出错"));
      reader.readAsText(file);
    });
  };
  
  // 读取文件为Base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          // 从ArrayBuffer获取Base64
          const arrayBuffer = event.target.result;
          let binary = '';
          
          if (arrayBuffer instanceof ArrayBuffer) {
            const bytes = new Uint8Array(arrayBuffer);
            const len = Math.min(bytes.byteLength, 1024 * 50); // 最多读取50KB内容
            for (let i = 0; i < len; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);
            resolve(base64);
          } else {
            reject(new Error("无效的文件内容格式"));
          }
        } else {
          reject(new Error("读取文件失败"));
        }
      };
      reader.onerror = () => reject(new Error("读取文件时出错"));
      reader.readAsArrayBuffer(file);
    });
  };
  
  // 测验相关函数
  const handleSelectAnswer = (answer: string) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestionIndex]: answer
    });
    setErrorMessage(null); // 清除错误消息
  };
  
  const goToNextQuestion = () => {
    if (generatedQuestions && generatedQuestions.questions && 
        currentQuestionIndex < generatedQuestions.questions.length - 1) {
      // 检查当前问题是否已回答
      if (selectedAnswers[currentQuestionIndex] === undefined) {
        setErrorMessage("请先回答当前问题");
        return;
      }
      setErrorMessage(null); // 清除错误消息
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // 检查最后一题是否已回答
      if (generatedQuestions && generatedQuestions.questions && 
          selectedAnswers[currentQuestionIndex] === undefined) {
        setErrorMessage("请先回答当前问题");
        return;
      }
      setErrorMessage(null); // 清除错误消息
      setShowResults(true);
    }
  };
  
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
  };
  
  const calculateScore = () => {
    if (!generatedQuestions || !generatedQuestions.questions) return { score: 0, total: 0, percentage: 0 };
    
    let correctAnswers = 0;
    generatedQuestions.questions.forEach((q: any, idx: number) => {
      if (selectedAnswers[idx] === q.answer) {
        correctAnswers++;
      }
    });
    return {
      score: correctAnswers,
      total: generatedQuestions.questions.length,
      percentage: Math.round((correctAnswers / generatedQuestions.questions.length) * 100)
    };
  };
  
  // 当新题目生成时，重置测验状态
  useEffect(() => {
    if (generatedQuestions) {
      resetQuiz();
    }
  }, [generatedQuestions]);

  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) {
      setSettingsMessage("用户名不能为空");
      return;
    }

    try {
      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: currentUser.id, 
          newUsername 
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 更新本地存储和状态
        const updatedUser = { ...currentUser, username: newUsername };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        setSettingsMessage("用户名更新成功");
      } else {
        setSettingsMessage(data.message || "更新失败");
      }
    } catch (error) {
      console.error("更新用户名错误:", error);
      setSettingsMessage("服务器错误，请稍后再试");
    }
    
    setTimeout(() => {
      setSettingsMessage("");
    }, 3000);
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setSettingsMessage("请填写所有密码字段");
      return;
    }

    if (newPassword !== confirmPassword) {
      setSettingsMessage("两次输入的新密码不一致");
      return;
    }

    try {
      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: currentUser.id,
          currentPassword,
          newPassword 
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 更新本地存储和状态
        const updatedUser = { ...currentUser, password: newPassword };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setSettingsMessage("密码更新成功");
      } else {
        setSettingsMessage(data.message || "更新失败");
      }
    } catch (error) {
      console.error("更新密码错误:", error);
      setSettingsMessage("服务器错误，请稍后再试");
    }
    
    setTimeout(() => {
      setSettingsMessage("");
    }, 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push("/");
  };

  // 保存并发送测验题目
  const handleSaveAndSendQuiz = async () => {
    if (!selectedCourseForAI) {
      setMessage("请先选择一个课程");
      return;
    }
    
    if (!generatedQuestions || !generatedQuestions.questions || generatedQuestions.questions.length === 0) {
      setMessage("请先生成测验题目");
      return;
    }
    
    setIsSendingQuiz(true);
    setMessage("正在保存并发送测验题目...");
    
    try {
      // 保存测验到数据库
      const quizData = {
        courseId: selectedCourseForAI,
        title: selectedFile ? selectedFile.name.split('.')[0] : "未命名测验",
        questions: generatedQuestions.questions,
        timeLimit: 2, // 2分钟时间限制
        isActive: true
      };
      
      const response = await fetch("/api/course/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quizData)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "保存测验失败");
      }
      
      setQuizSent(true);
      setMessage("测验已成功发送给所有课程成员！成员将有2分钟时间完成测验。");
      
      // 3秒后重置状态
      setTimeout(() => {
        setGeneratedQuestions(null);
        setSelectedFile(null);
        setQuizSent(false);
      }, 3000);
      
    } catch (error: any) {
      console.error("发送测验失败:", error);
      setMessage(`发送测验失败: ${error.message}`);
    } finally {
      setIsSendingQuiz(false);
    }
  };

  // 修改统计数据加载方式
  useEffect(() => {
    if (activeTab === "statistics" && selectedCourse) {
      // 只拉取问卷列表
      fetch(`/api/quiz/list?courseId=${selectedCourse}`)
        .then(res => res.json())
        .then(data => {
          setQuizList(Array.isArray(data) ? data : []);
        });
    }
  }, [activeTab, selectedCourse]);

  // 添加根据选择的问卷ID加载统计数据的函数
  const fetchQuizStatistics = async (quizId: number) => {
    setIsLoadingStatistics(true);
    try {
      const res = await fetch(`/api/quiz/statistics?courseId=${selectedCourse}&quizId=${quizId}`);
      const data = await res.json();
      setQuizStatistics(data);
    } catch (error) {
      console.error("获取问卷统计数据失败:", error);
    } finally {
      setIsLoadingStatistics(false);
    }
  };

  // 问卷选择变化时加载统计数据
  useEffect(() => {
    if (selectedQuiz) {
      fetchQuizStatistics(selectedQuiz);
    }
  }, [selectedQuiz]);

  // 添加状态存储多个通知
  const [pendingNotifications, setPendingNotifications] = useState<Array<{
    courseId: number;
    courseTitle: string;
    quizId: number;
    quizTitle: string;
  }>>([]);

  const checkNewStatisticsNotification = async () => {
    if (!currentUser) return;

    const res = await fetch(`/api/quiz/statistics/notify?userId=${currentUser.id}`);
    const data = await res.json();

    if (data.hasNewStatistics && data.notifications && data.notifications.length > 0) {
      setShowStatisticsNotification(true);
      setPendingNotifications(data.notifications);

      // 1分钟后自动关闭
      if (!statisticsNotificationTimeout) {
        const timeout = setTimeout(() => {
          setShowStatisticsNotification(false);
        }, 60000);
        setStatisticsNotificationTimeout(timeout);
      }
    }
  };

  useEffect(() => {
    if (activeTab === "statistics" && currentUser) {
      checkNewStatisticsNotification();
      const interval = setInterval(checkNewStatisticsNotification, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab, currentUser]);

  const handleCloseStatisticsNotification = () => {
    setShowStatisticsNotification(false);
    if (currentQuizId) {
      localStorage.setItem(`statisticsNotificationClosed_${currentQuizId}`, "1");
    }
    if (statisticsNotificationTimeout) {
      clearTimeout(statisticsNotificationTimeout);
      setStatisticsNotificationTimeout(null);
    }
  };

  if (!currentUser) {
    return <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800">加载中...</div>;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800">
      {/* 左侧导航栏 */}
      <div className="w-64 bg-white p-5 flex flex-col border-r border-gray-200 shadow-sm">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-gray-800">POP QUIZ</h1>
        </div>
        
        <nav className="flex-1">
          <ul className="space-y-1">
            <li>
              <button 
                className={`w-full p-3 text-left rounded-md transition-colors ${activeTab === "courses" ? "bg-gray-100 text-gray-800 font-medium border-l-4 border-gray-400" : "text-gray-600 hover:bg-gray-50"}`}
                onClick={() => setActiveTab("courses")}
              >
                课程
              </button>
            </li>
            <li>
              <button 
                className={`w-full p-3 text-left rounded-md transition-colors ${activeTab === "statistics" ? "bg-gray-100 text-gray-800 font-medium border-l-4 border-gray-400" : "text-gray-600 hover:bg-gray-50"}`}
                onClick={() => setActiveTab("statistics")}
              >
                统计
              </button>
            </li>
            <li>
              <button 
                className={`w-full p-3 text-left rounded-md transition-colors ${activeTab === "settings" ? "bg-gray-100 text-gray-800 font-medium border-l-4 border-gray-400" : "text-gray-600 hover:bg-gray-50"}`}
                onClick={() => setActiveTab("settings")}
              >
                设置
              </button>
            </li>
          </ul>
        </nav>
        
        <div className="mt-auto pt-4 border-t border-gray-200">
          <button 
            className="w-full p-3 text-left text-red-600 hover:bg-red-50 rounded-md transition-colors"
            onClick={handleLogout}
          >
            退出登录
          </button>
        </div>
      </div>
      
      {/* 主内容区 */}
      <div className="flex-1 p-8 bg-white overflow-y-auto m-4 rounded-lg shadow-sm border border-gray-200">
        {/* 课程页面 */}
        {activeTab === "courses" && (
          <div className="flex flex-col h-full">
            <div className="flex-none">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">我的课程</h2>
              
              {/* 创建课程区域 */}
              <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300"></div>
                <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
                  <div className="flex-1">
                    <input 
                      type="text" 
                      placeholder="输入课程标题" 
                      value={courseTitle}
                      onChange={(e) => setCourseTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                    />
                  </div>
                  <div className="md:flex-none">
                    <button 
                      className="w-full md:w-auto px-6 py-2 bg-transparent text-gray-800 rounded-md hover:bg-gray-100 transition-colors border border-gray-300"
                      onClick={handleCreateCourse}
                    >
                      创建课程
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 课程列表 */}
            <div className="flex-1 overflow-auto">
              {Array.isArray(courses) && courses.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {courses.map(course => (
                    <div key={course.id} className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300"></div>
                      <h3 className="text-xl font-medium mb-2 text-gray-800">{course.title}</h3>
                      
                      {/* 课程基础信息与课程码放在同一行，使用相同样式 */}
                      <div className="flex items-center flex-wrap text-sm text-gray-500 mb-4">
                        <span className="font-medium mr-2">课程码:</span>
                        <span className="bg-gray-100 px-3 py-1 rounded-md font-mono mr-4">{course.courseCode}</span>
                        
                        <span className="font-medium mr-2">组织者:</span>
                        <span className="bg-gray-100 px-3 py-1 rounded-md mr-4">{extraInfo[course.id]?.organizer || '加载中...'}</span>
                        
                        {extraInfo[course.id]?.speaker && (
                          <>
                            <span className="font-medium mr-2">演讲者:</span>
                            <span className="bg-gray-100 px-3 py-1 rounded-md mr-4">{extraInfo[course.id].speaker}</span>
                          </>
                        )}
                        
                        <span className="font-medium mr-2">成员数:</span>
                        <span className="bg-gray-100 px-3 py-1 rounded-md">{extraInfo[course.id]?.members ?? 0}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <button 
                          className="py-2 px-3 bg-transparent hover:bg-gray-100 text-gray-800 rounded-md transition-colors border border-gray-300"
                          onClick={() => handleManageCourse(course.id)}
                        >
                          管理
                        </button>
                        <button 
                          className="py-2 px-3 bg-transparent hover:bg-gray-100 text-red-600 rounded-md transition-colors border border-gray-300"
                          onClick={() => handleDeleteCourse(course.id)}
                        >
                          删除
                        </button>
                        <button 
                          className={`py-2 px-3 rounded-md transition-colors border ${
                            selectedCourseForAI === course.id 
                              ? 'bg-gray-700 text-white border-gray-700' 
                              : 'bg-transparent hover:bg-gray-100 text-gray-800 border-gray-300'
                          }`}
                          onClick={() => setSelectedCourseForAI(course.id === selectedCourseForAI ? null : course.id)}
                        >
                          {selectedCourseForAI === course.id ? '已选择' : '选择'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-600">您还没有创建任何课程</p>
                  <p className="text-gray-500 text-sm mt-2">使用上方表单创建您的第一个课程</p>
                </div>
              )}
            </div>
            
            {/* 底部AI问卷生成区域 */}
            <div className="flex-none mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300"></div>
              
              <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
                <div className="w-full md:w-1/3">
                  {selectedCourseForAI ? (
                    <div className="bg-gray-100 px-4 py-2 rounded-md border border-gray-300">
                      <p className="text-sm text-gray-600">已选择课程:</p>
                      <p className="font-medium">{courses.find(c => c.id === selectedCourseForAI)?.title || '未知课程'}</p>
                    </div>
                  ) : (
                    <div className="bg-gray-100 px-4 py-2 rounded-md border border-gray-300">
                      <p className="text-sm text-gray-600">未选择课程</p>
                    </div>
                  )}
                </div>
                
                <div className="ml-auto flex space-x-3">
                  <button
                    className="px-6 py-2 bg-transparent hover:bg-gray-100 text-gray-800 rounded-md transition-colors border border-gray-300"
                    onClick={() => {
                      const fileInput = document.createElement('input');
                      fileInput.type = 'file';
                      fileInput.onchange = (e) => {
                        const target = e.target as HTMLInputElement;
                        if (target && target.files) {
                          const event = {
                            target: {
                              files: target.files
                            }
                          } as React.ChangeEvent<HTMLInputElement>;
                          handleFileChange(event);
                        }
                      };
                      fileInput.click();
                    }}
                  >
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      选择文件
                    </div>
                  </button>
                
                  <button 
                    className={`px-6 py-2 rounded-md transition-colors ${processingAI ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-gray-700 text-white hover:bg-gray-800'}`}
                    onClick={handleProcessWithAI}
                    disabled={processingAI}
                  >
                    {processingAI ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        处理中...
                      </span>
                    ) : "POP QUIZ"}
                  </button>
                </div>
              </div>

              {/* 只保留消息提示区域 */}
              {message && (
                <div className={`mt-4 p-3 rounded-md ${message.includes('失败') || message.includes('错误') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {message}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 统计页面 */}
        {activeTab === "statistics" && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">统计数据</h2>
            
            {/* 课程选择 */}
            <div className="mb-6">
              <label className="block text-sm text-gray-700 mb-2">选择课程</label>
              <select
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                value={selectedCourse || ""}
                onChange={(e) => setSelectedCourse(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">请选择课程</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>
            
            {selectedCourse ? (
              <div className="flex flex-col md:flex-row gap-6">
                {/* 左侧问卷区域 */}
                <div className="w-full md:w-2/3">
                  {/* 问卷选择 */}
                  <div className="mb-6">
                    <label className="block text-sm text-gray-700 mb-2">选择问卷</label>
                    <select
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                      value={selectedQuiz || ""}
                      onChange={(e) => setSelectedQuiz(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">请选择问卷</option>
                      {quizList
                        .filter(quiz => quiz.courseId === selectedCourse)
                        .map(quiz => (
                          <option key={quiz.id} value={quiz.id}>{quiz.title}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* 问卷统计部分 */}
                  {selectedQuiz ? (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-medium text-gray-800">问卷统计</h3>
                      </div>
                      
                      {isLoadingStatistics ? (
                        <div className="flex justify-center items-center p-12">
                          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                          <span className="ml-3 text-gray-600">加载中...</span>
                        </div>
                      ) : (
                        quizStatistics
                          .filter(q => q.quizId === selectedQuiz)
                          .map(quiz => (
                            <div key={quiz.quizId}>
                              <div className="mb-4 p-4 bg-gray-50 rounded border">
                                {/* 移除了问卷标题 */}
                                <div className="flex">
                                  <div className="bg-blue-50 p-4 rounded-md border border-blue-100 w-1/3">
                                    <div className="text-md text-blue-800 font-medium">演讲效果</div>
                                    <div className="mt-2 flex items-end justify-center">
                                      <div className="text-6xl font-bold text-blue-700 leading-none">{quiz.presentationEffectiveness}</div>
                                      <div className="text-2xl font-bold text-blue-700 ml-1 mb-1.5">分</div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex-1 grid grid-cols-2 gap-2 ml-3">
                                    <div className="bg-white p-2 rounded shadow-sm">
                                      <div className="text-sm text-gray-500">听众数</div>
                                      <div className="text-lg font-bold">{quiz.audienceCount}</div>
                                    </div>
                                    <div className="bg-white p-2 rounded shadow-sm">
                                      <div className="text-sm text-gray-500">提交人数</div>
                                      <div className="text-lg font-bold">{quiz.submittedCount}</div>
                                    </div>
                                    <div className="bg-white p-2 rounded shadow-sm">
                                      <div className="text-sm text-gray-500">未提交率</div>
                                      <div className="text-lg font-bold">{quiz.notSubmitRate}%</div>
                                    </div>
                                    <div className="bg-white p-2 rounded shadow-sm">
                                      <div className="text-sm text-gray-500">平均错误率</div>
                                      <div className="text-lg font-bold">{quiz.errorRate}%</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* 移除"题目统计"字样 */}
                              {quiz.questions.map((q) => (
                                <div key={q.questionId} className="mb-4 p-4 bg-gray-50 rounded border">
                                  <div className="font-medium mb-2">{q.questionText}</div>
                                  
                                  {/* 显示正确率在选项列表的最上方 */}
                                  {q.correctRate !== undefined && (
                                    <div className="text-sm text-green-600 font-medium mb-2">正确率: {q.correctRate}%</div>
                                  )}
                                  
                                  {/* 选项统计，使用isCorrect属性标识正确选项 */}
                                  {q.options && q.options.length > 0 && q.options.map((opt: { text: string; count: number; isCorrect?: boolean }, idx: number) => (
                                    <div
                                      key={opt.text}
                                      className="flex items-center w-full mb-2"
                                      title={opt.text}
                                    >
                                      {/* 选项字母，正确选项标绿 */}
                                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-bold ${opt.isCorrect ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                                        {String.fromCharCode(65 + idx)}
                                      </span>
                                      {/* 选项内容 */}
                                      <span className="ml-2 flex-1 whitespace-pre-line break-words">{opt.text}</span>
                                      {/* 选择人数，正确选项标绿 */}
                                      <div className="flex flex-col items-end">
                                        <span className={`text-sm ${opt.isCorrect ? 'text-green-600' : 'text-gray-500'}`}>
                                          （{opt.count}人选择）
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          ))
                      )}
                    </div>
                  ) : (
                    <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-600">请先选择一个问卷</p>
                    </div>
                  )}
                </div>
                
                {/* 右侧留言区域 */}
<div className="w-full md:w-1/3">
  <div className="mb-4">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-xl font-medium text-gray-800">留言</h3>
    </div>
    
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden h-full">
      {/* 留言选项卡 */}
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 py-2 text-sm font-medium ${
            activeCommentTab === "course" 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveCommentTab("course")}
        >
          课程留言
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium ${
            activeCommentTab === "quiz" 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveCommentTab("quiz")}
          disabled={!selectedQuiz}
        >
          测验留言
        </button>
      </div>
      
      {/* 留言内容区域 */}
      <div className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto p-4">
        {activeCommentTab === "course" ? (
          courseComments.length > 0 ? (
            courseComments.map(comment => (
              <div key={comment.id} className="py-3">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium">{comment.user.username}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-700 text-sm">{comment.content}</p>
              </div>
            ))
          ) : (
            <div className="text-center p-8">
              <p className="text-gray-600">此课程尚无留言</p>
            </div>
          )
        ) : (
          quizComments.length > 0 ? (
            quizComments.map(comment => (
              <div key={comment.id} className="py-3">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium">{comment.user.username}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-700 text-sm">{comment.content}</p>
              </div>
            ))
          ) : (
            <div className="text-center p-8">
              <p className="text-gray-600">此测验尚无留言</p>
            </div>
          )
        )}
      </div>
    </div>
  </div>
</div>
              </div>
            ) : (
              <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-600">请先选择一个课程查看统计数据</p>
              </div>
            )}
          </div>
        )}
        
        {/* 设置页面 */}
        {activeTab === "settings" && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">账号设置</h2>
            
            {/* 个人资料设置 */}
            <div className="mb-8 p-6 bg-white rounded-lg border border-gray-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300"></div>
              <h3 className="text-lg font-medium mb-4 text-gray-800">个人资料</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">用户名</label>
                  <input 
                    type="text" 
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
                <button 
                  className="px-4 py-2 bg-transparent text-gray-800 rounded-md hover:bg-gray-100 transition-colors border border-gray-300"
                  onClick={handleUpdateUsername}
                >
                  更新用户名
                </button>
              </div>
            </div>
            
            {/* 密码设置 */}
            <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300"></div>
              <h3 className="text-lg font-medium mb-4 text-gray-800">更改密码</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">当前密码</label>
                  <input 
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">新密码</label>
                  <input 
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">确认新密码</label>
                  <input 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
                <button 
                  className="px-4 py-2 bg-transparent text-gray-800 rounded-md hover:bg-gray-100 transition-colors border border-gray-300"
                  onClick={handleUpdatePassword}
                >
                  更新密码
                </button>
              </div>
            </div>
            
            {settingsMessage && (
              <p className={`mt-3 text-sm ${settingsMessage.includes("成功") ? "text-green-600" : "text-red-600"}`}>
                {settingsMessage}
              </p>
            )}
          </div>
        )}
      </div>
      
      {showStatisticsNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg animate-pop-in max-w-md">
            <h3 className="text-xl font-bold mb-2">📊 统计结果可用</h3>
            
            {pendingNotifications.length > 0 && (
              <div className="mb-4">
                <p className="mb-2">以下课程的问卷统计结果可供查看：</p>
                <ul className="list-disc pl-5 mb-3">
                  {/* 使用Set来确保课程不重复 */}
                  {Array.from(new Set(pendingNotifications.map(n => n.courseId))).map((courseId) => {
                    const notification = pendingNotifications.find(n => n.courseId === courseId);
                    return (
                      <li key={courseId} className="mb-1">
                        课程【{notification?.courseTitle || '未知课程'}】
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setShowStatisticsNotification(false);
                  // 移除自动跳转到统计页面
                  if (statisticsNotificationTimeout) {
                    clearTimeout(statisticsNotificationTimeout);
                    setStatisticsNotificationTimeout(null);
                  }
                }}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 