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

export default function OrganizerPage() {
  const [activeTab, setActiveTab] = useState("courses");
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
      
      // 检查文件大小，限制在10MB以内
      const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSizeInBytes) {
        setMessage(`文件过大，请选择小于10MB的文件`);
        return;
      }
      
      // 检查文件类型，仅接受文本文件、PDF和文档
      const acceptedTypes = ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      
      // 由于浏览器可能不会准确识别所有文件类型，我们也接受某些特定扩展名
      const fileName = file.name.toLowerCase();
      const isAcceptableExtension = ['.txt', '.pdf', '.doc', '.docx'].some(ext => fileName.endsWith(ext));
      
      // 如果文件类型不在接受列表中，且扩展名也不被接受，则拒绝
      if (!acceptedTypes.includes(file.type) && !isAcceptableExtension) {
        setMessage(`不支持的文件类型，请上传文本文件、PDF或Word文档`);
        return;
      }
      
      setSelectedFile(file);
      setMessage(`已选择文件: ${file.name}`);
    }
  };
  
  // 辅助函数：读取文件内容
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // 针对不同文件类型使用不同的处理策略
      const fileName = file.name.toLowerCase();
      
      // 如果是非文本文件(如PDF或DOC)，使用特殊提示
      if (!fileName.endsWith('.txt') && !fileName.endsWith('.md')) {
        // 对于PDF文件，提供更具体的描述请求
        if (fileName.endsWith('.pdf')) {
          resolve(`这是一个PDF文件，名为"${file.name}"，大小为${(file.size / 1024).toFixed(2)}KB。
请根据这个PDF文件可能的主题（从文件名推测），生成5个相关领域的单选题。
文件名: ${file.name}`);
        } else {
          // 其他非文本文件
          resolve(`这是一个文档文件，名为"${file.name}"，大小为${(file.size / 1024).toFixed(2)}KB。
请根据这个文件名，生成5个相关领域的单选题。
文件名: ${file.name}`);
        }
        return;
      }
      
      // 处理文本文件
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          // 限制文本长度
          const text = event.target.result.toString();
          const maxLength = 20000; // 最大字符数
          
          if (text.length > maxLength) {
            const truncated = text.substring(0, maxLength) + "\n\n... [内容过长，已截断] ...";
            resolve(truncated);
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
    setMessage("AI正在分析内容并生成问卷...");
    setGeneratedQuestions(null); // 清除之前的结果
    
    try {
      // 读取文件内容
      let content = "";
      if (selectedFile) {
        try {
          content = await readFileContent(selectedFile);
          console.log("已读取文件内容，长度:", content.length);
        } catch (readError: any) {
          console.error("读取文件错误:", readError);
          throw new Error(`无法读取文件: ${readError.message}`);
        }
      }
      
      if (!content.trim()) {
        throw new Error("文件内容为空");
      }
      
      console.log("准备发送到API的内容长度:", content.length);
      
      // 调用API生成测验
      const response = await fetch("/api/ai/generate-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ content })
      });
      
      console.log("API响应状态:", response.status);
      
      const result = await response.json();
      console.log("API返回结果:", result);
      
      if (result.error) {
        throw new Error(`API错误: ${result.error} ${result.details || ''}`);
      }
      
      // 确保result包含questions数组
      if (!result.questions || !Array.isArray(result.questions) || result.questions.length === 0) {
        throw new Error("API返回的数据结构不正确，缺少questions数组");
      }
      
      // 显示生成的问题
      setGeneratedQuestions(result);
      setProcessingAI(false);
      setMessage("已成功生成测验题目");
      
    } catch (error: any) {
      console.error("AI处理失败:", error);
      setProcessingAI(false);
      setMessage(`生成测验失败: ${error.message}`);
    }
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
                      <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                        <span className="font-medium">课程码:</span>
                        <span className="bg-gray-100 px-3 py-1 rounded-md font-mono">{course.courseCode}</span>
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
                    ) : "生成题目"}
                  </button>
                </div>
              </div>

              {/* 生成的测验题目显示区域 */}
              {generatedQuestions && generatedQuestions.questions && generatedQuestions.questions.length > 0 && (
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium mb-4">生成的测验题目</h3>
                  
                  <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                    {/* 测验预览 */}
                    <div className="quiz-preview">
                      {/* 测验标题 */}
                      <h2 className="text-2xl font-bold text-center text-gray-800 mb-8 pb-2 border-b border-gray-200">
                        {selectedFile?.name.split('.')[0] || "测验题目"}
                      </h2>
                      
                      {/* 测验内容 */}
                      {showResults ? (
                        <div className="quiz-results">
                          {/* 分数显示 */}
                          <div className="text-center py-6 mb-8 bg-gray-50 rounded-lg">
                            <h3 className="text-4xl font-bold mb-2">{calculateScore().percentage}%</h3>
                            <p className="text-gray-600">{calculateScore().score} out of {calculateScore().total} correct</p>
                            <p className="mt-4 text-gray-700">
                              {calculateScore().percentage >= 80 ? "优秀！" : 
                               calculateScore().percentage >= 60 ? "不错！" : 
                               "继续努力！"}
                            </p>
                          </div>
                          
                          {/* 问题回顾 */}
                          <div className="mt-8">
                            <h3 className="text-xl font-semibold mb-4">测验回顾</h3>
                            
                            <div className="space-y-6">
                              {generatedQuestions.questions.map((q: any, idx: number) => {
                                const isCorrect = selectedAnswers[idx] === q.answer;
                                const options = q.options && typeof q.options === 'object' ? q.options : {};
                                const optionKeys = Object.keys(options).length > 0 ? Object.keys(options) : ["A", "B", "C", "D"];
                                
                                return (
                                  <div key={idx} className="pb-4">
                                    <h4 className="font-medium mb-3">{q.question}</h4>
                                    <div className="space-y-2">
                                      {optionKeys.map(key => (
                                        <div 
                                          key={key} 
                                          className={`p-3 rounded-md border ${
                                            key === q.answer ? 'border-green-500 bg-green-50' : 
                                            key === selectedAnswers[idx] ? 'border-red-500 bg-red-50' : 
                                            'border-gray-200'
                                          }`}
                                        >
                                          <div className="flex items-center">
                                            <span className={`inline-block w-6 h-6 rounded-full mr-2 text-center flex items-center justify-center ${
                                              key === q.answer ? 'bg-green-500 text-white' : 
                                              key === selectedAnswers[idx] ? 'bg-red-500 text-white' : 
                                              'bg-gray-100 text-gray-700'
                                            }`}>
                                              {key}
                                            </span>
                                            <span className="flex-grow">{options[key] || `选项${key}`}</span>
                                            {key === q.answer && (
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                              </svg>
                                            )}
                                            {key === selectedAnswers[idx] && key !== q.answer && (
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                              </svg>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          
                          <button 
                            onClick={resetQuiz}
                            className="mt-8 w-full py-3 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors"
                          >
                            重新测试
                          </button>
                        </div>
                      ) : (
                        <div className="quiz-question">
                          {generatedQuestions.questions[currentQuestionIndex] && (
                            <>
                              <h3 className="text-xl font-medium mb-6">{generatedQuestions.questions[currentQuestionIndex].question}</h3>
                              
                              <div className="space-y-3">
                                {(() => {
                                  const currentQuestion = generatedQuestions.questions[currentQuestionIndex];
                                  const options = currentQuestion.options && typeof currentQuestion.options === 'object' ? currentQuestion.options : {};
                                  const optionKeys = Object.keys(options).length > 0 ? Object.keys(options) : ["A", "B", "C", "D"];
                                  
                                  return optionKeys.map(key => (
                                    <div 
                                      key={key} 
                                      className={`p-4 rounded-md border transition-all cursor-pointer ${
                                        selectedAnswers[currentQuestionIndex] === key 
                                          ? 'border-gray-800 bg-gray-100' 
                                          : 'border-gray-200 hover:border-gray-400'
                                      }`}
                                      onClick={() => handleSelectAnswer(key)}
                                    >
                                      <div className="flex items-center">
                                        <span className={`inline-block w-8 h-8 rounded-full mr-3 text-center flex items-center justify-center ${
                                          selectedAnswers[currentQuestionIndex] === key 
                                            ? 'bg-gray-800 text-white' 
                                            : 'bg-gray-100 text-gray-700'
                                        }`}>
                                          {key}
                                        </span>
                                        <span className="flex-grow">{options[key] || `选项${key}`}</span>
                                      </div>
                                    </div>
                                  ));
                                })()}
                              </div>
                              
                              {/* 错误消息显示 */}
                              {errorMessage && (
                                <div className="mt-4 p-2 bg-red-50 border border-red-100 rounded-md text-red-600 text-sm">
                                  {errorMessage}
                                </div>
                              )}
                              
                              {/* 导航区域 */}
                              <div className="mt-8 flex justify-between items-center">
                                <button 
                                  onClick={goToPreviousQuestion}
                                  disabled={currentQuestionIndex === 0}
                                  className={`flex items-center py-2 px-4 rounded-md ${
                                    currentQuestionIndex === 0 
                                      ? 'text-gray-400 cursor-not-allowed' 
                                      : 'text-gray-700 hover:bg-gray-100'
                                  }`}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  上一题
                                </button>
                                
                                <span className="text-gray-600">
                                  {currentQuestionIndex + 1} / {generatedQuestions.questions.length}
                                </span>
                                
                                <button 
                                  onClick={goToNextQuestion}
                                  className="flex items-center py-2 px-4 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors"
                                >
                                  {currentQuestionIndex === generatedQuestions.questions.length - 1 ? '查看结果' : '下一题'}
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-between">
                    <button 
                      className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-800 hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        setGeneratedQuestions(null);
                        setSelectedFile(null);
                        setMessage("");
                      }}
                    >
                      清除
                    </button>
                    <div className="space-x-2">
                      <button 
                        className={`px-4 py-2 ${quizSent ? 'bg-green-600' : 'bg-gray-700'} text-white rounded-md hover:${quizSent ? 'bg-green-700' : 'bg-gray-800'} transition-colors`}
                        onClick={handleSaveAndSendQuiz}
                        disabled={isSendingQuiz || quizSent}
                      >
                        {isSendingQuiz ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            发送中...
                          </span>
                        ) : quizSent ? "已发送" : "发送测验 (2分钟)"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
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
                      
                      {surveyResults.filter(result => result.quizId === selectedQuiz).length > 0 ? (
                        <div className="space-y-8">
                          {surveyResults.filter(result => result.quizId === selectedQuiz).map(result => (
                            <div key={result.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                              {/* 问卷结果展示 */}
                              <div className="p-6 border-b border-gray-200">
                                <h4 className="text-lg font-medium mb-4">{result.questionText}</h4>
                                <div className="space-y-4">
                                  {result.options.map((option, index) => (
                                    <div key={index} className="relative">
                                      <div className="flex items-center mb-1">
                                        <span className="text-sm text-gray-600 w-20">{option.text}</span>
                                        <div className="flex-1 ml-2">
                                          <div 
                                            className="h-6 bg-gray-200 rounded-md relative overflow-hidden"
                                            style={{ width: "100%" }}
                                          >
                                            <div 
                                              className="h-full bg-gradient-to-r from-gray-500 to-gray-400 absolute top-0 left-0"
                                              style={{ width: `${(option.count / Math.max(...result.options.map(o => o.count))) * 100}%` }}
                                            ></div>
                                          </div>
                                        </div>
                                        <span className="ml-2 text-sm w-10 text-right">{option.count}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <p className="mt-4 text-sm text-gray-500">总回答数: {result.totalResponses}</p>
                              </div>
                              
                              {/* 问卷讨论区 */}
                              <div className="p-6 bg-gray-50">
                                <h4 className="text-md font-medium mb-3">问题讨论</h4>
                                
                                {surveyDiscussions[result.id] && surveyDiscussions[result.id].length > 0 ? (
                                  <div className="space-y-3">
                                    {surveyDiscussions[result.id].map(message => (
                                      <div key={message.id} className="p-3 bg-white rounded-md border border-gray-200">
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="font-medium text-sm">{message.userName}</span>
                                          <span className="text-xs text-gray-500">{message.timestamp}</span>
                                        </div>
                                        <p className="text-sm text-gray-700">{message.content}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500">暂无讨论</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-gray-600">此问卷尚无统计结果</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-600">请先选择一个问卷</p>
                    </div>
                  )}
                </div>
                
                {/* 右侧课程留言区 */}
                <div className="w-full md:w-1/3">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-medium text-gray-800">课程留言</h3>
                    </div>
                    
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden h-full">
                      {messages.filter(message => message.courseId === selectedCourse).length > 0 ? (
                        <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                          {messages.filter(message => message.courseId === selectedCourse).map(message => (
                            <div key={message.id} className="p-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">{message.userName}</span>
                                <span className="text-sm text-gray-500">{message.timestamp}</span>
                              </div>
                              <p className="text-gray-700">{message.content}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center p-8">
                          <p className="text-gray-600">此课程尚无留言</p>
                        </div>
                      )}
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
    </div>
  );
} 