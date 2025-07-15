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
  const [isRecording, setIsRecording] = useState(false);
  const [selectedCourseForAI, setSelectedCourseForAI] = useState<number | null>(null);
  const [processingAI, setProcessingAI] = useState(false);
  
  // Statistics state
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  
  // 问卷相关数据
  const [quizList, setQuizList] = useState<{id: number, courseId: number, title: string}[]>([
    { id: 1, courseId: 1, title: "Web开发基础 - 第一周反馈" },
    { id: 2, courseId: 1, title: "Web开发基础 - 第二周反馈" },
    { id: 3, courseId: 2, title: "数据结构与算法 - 期中反馈" }
  ]);
  
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  
  const [surveyResults, setSurveyResults] = useState<SurveyResult[]>([
    {
      id: 1,
      courseId: 1,
      quizId: 1,
      questionText: "您对本课程的整体满意度如何？",
      options: [
        { text: "非常满意", count: 15 },
        { text: "满意", count: 23 },
        { text: "一般", count: 8 },
        { text: "不满意", count: 3 },
      ],
      totalResponses: 49
    },
    {
      id: 2,
      courseId: 1,
      quizId: 1,
      questionText: "课程内容难度适中吗？",
      options: [
        { text: "太简单", count: 5 },
        { text: "适中", count: 35 },
        { text: "有点难", count: 7 },
        { text: "太难", count: 2 },
      ],
      totalResponses: 49
    }
  ]);
  
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, courseId: 1, userName: "学生A", content: "课程非常有用，谢谢老师！", timestamp: "2023-05-15 14:30" },
    { id: 2, courseId: 1, userName: "学生B", content: "能否多讲一些实际应用案例？", timestamp: "2023-05-15 15:45" },
    { id: 3, courseId: 2, userName: "学生C", content: "算法部分有点难理解，可以再详细解释一下吗？", timestamp: "2023-05-16 10:15" },
  ]);
  
  // 问卷讨论区数据
  const [surveyDiscussions, setSurveyDiscussions] = useState<{[key: number]: Message[]}>({
    1: [
      { id: 101, courseId: 1, userName: "学生D", content: "整体满意度问题很好，但是可以增加更细化的评分", timestamp: "2023-05-17 10:25" },
      { id: 102, courseId: 1, userName: "学生E", content: "希望在这个问题中增加一个\"非常不满意\"的选项", timestamp: "2023-05-17 11:30" },
    ],
    2: [
      { id: 201, courseId: 1, userName: "学生F", content: "难度这个问题可以具体到每个章节", timestamp: "2023-05-18 09:15" },
    ]
  });
  
  // Settings state
  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");

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

  useEffect(() => {
    fetchCourses();
  }, []);

  // 创建课程
  const fetchCourses = async () => {
    const res = await fetch("/api/course");
    const data = await res.json();
    console.log("课程数据", data);
    setCourses(Array.isArray(data) ? data : []);
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
    router.push(`/organizer/course/${courseId}`);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setMessage(`已选择文件: ${event.target.files[0].name}`);
    }
  };
  
  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (isRecording) {
      // 停止录音逻辑（实际功能暂不实现）
      setMessage("录音已完成");
    } else {
      setMessage("正在录音...");
    }
  };
  
  const handleProcessWithAI = () => {
    if (!selectedCourseForAI) {
      setMessage("请先在课程列表中选择一个课程");
      return;
    }
    
    if (!selectedFile && !isRecording) {
      setMessage("请先上传文件或进行录音");
      return;
    }
    
    // 模拟AI处理
    setProcessingAI(true);
    setMessage("AI正在分析内容并生成问卷...");
    
    // 模拟处理完成
    setTimeout(() => {
      setProcessingAI(false);
      setMessage("问卷已生成并发送给课程成员");
      setSelectedFile(null);
      setIsRecording(false);
      setSelectedCourseForAI(null);
      
      // 3秒后清除消息
      setTimeout(() => {
        setMessage("");
      }, 3000);
    }, 2000);
  };

  const handleUpdateUsername = async () => {
  if (!newUsername.trim()) {
    setSettingsMessage("请输入新用户名");
    return;
  }

  try {
    const response = await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        newUsername: newUsername.trim()
      })
    });

    const result = await response.json();
    
    if (result.success) {
      // 更新本地存储和状态
      const updatedUser = { 
        ...currentUser, 
        username: result.user.username 
      };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      setSettingsMessage("用户名更新成功！");
      
      // 3秒后清除消息
      setTimeout(() => {
        setSettingsMessage("");
      }, 3000);
    } else {
      setSettingsMessage(result.message || "更新用户名失败");
    }
  } catch (error) {
    setSettingsMessage("网络错误，请稍后重试");
  }
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
    const response = await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        currentPassword,
        newPassword
      })
    });

    const result = await response.json();
    if (result.success) {
      setSettingsMessage("密码更新成功！请重新登录");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      // 3秒后自动登出
      setTimeout(() => {
        handleLogout();
      }, 3000);
    } else {
      setSettingsMessage(result.message || "更新密码失败");
    }
  } catch (error) {
    setSettingsMessage("网络错误，请稍后重试");
  }
};
  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push("/");
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
                
                <div className="flex items-center space-x-4">
                  <label className="relative cursor-pointer p-3 bg-white rounded-full shadow-sm border border-gray-300 hover:bg-gray-50 transition-colors">
                    <input 
                      type="file" 
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </label>
                  
                  <button 
                    className={`p-4 rounded-full shadow-sm border transition-colors ${isRecording ? 'bg-red-100 border-red-300 hover:bg-red-200' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                    onClick={toggleRecording}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-9 w-9 ${isRecording ? 'text-red-600' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                  
                  <button 
                    className="p-3 bg-white rounded-full shadow-sm border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleProcessWithAI}
                    disabled={processingAI || (!selectedFile && !isRecording) || !selectedCourseForAI}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {message && (
                <p className={`mt-3 text-sm ${message.includes("成功") ? "text-green-600" : message.includes("错误") ? "text-red-600" : "text-gray-600"}`}>
                  {message}
                </p>
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