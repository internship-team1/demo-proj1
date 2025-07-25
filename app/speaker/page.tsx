"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Course {
  id: number;
  title: string;
  organizer: string;
  courseCode: string;
  // 新增字段
  speakerName?: string;       // 演讲者姓名（可选）
  memberCount?: number;       // 成员数
  isLoadingDetails?: boolean; // 加载状态
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

export default function SpeakerPage() {
  const [activeTab, setActiveTab] = useState<"courses" | "statistics" | "settings">("courses");
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Course state
  const [courses, setCourses] = useState<Course[]>([]);
  const [message, setMessage] = useState("");
  
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
      // 确保只有演讲者角色可以访问此页面
      if (user.role !== "speaker") {
        router.push("/");
        return;
      }
      setCurrentUser(user);
      setNewUsername(user.username);
      
      // 加载当前用户担任演讲者的课程
      fetchMySpeakerCourses(user.id);
      
      // 登录后立即检查统计通知，传入用户ID
      checkNewStatisticsNotification(user.id);
      const interval = setInterval(() => checkNewStatisticsNotification(user.id), 30000);
      return () => clearInterval(interval);
    } catch (error) {
      localStorage.removeItem('currentUser');
      router.push("/");
    }
  }, [router]);

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
  
  const fetchMySpeakerCourses = async (userId: number) => {
    if (!userId) {
      console.error("获取课程失败: 用户ID无效");
      return;
    }
    
    console.log("正在获取演讲者课程，用户ID:", userId);
    
    try {
      // 获取课程基础信息+详情
      const response = await fetch(`/api/courses/with-details?speakerId=${userId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "获取课程列表失败");
      }
      
      const coursesData = await response.json();
      console.log("获取到演讲者课程数据:", coursesData);
      
      setCourses(coursesData);
    } catch (error) {
      console.error("获取课程失败:", error);
      setMessage("获取课程列表失败，请刷新页面重试");
      
      // 3秒后清除错误消息
      setTimeout(() => {
        setMessage("");
      }, 3000);
    }
  };

  const handleDeleteCourse = (id: number) => {
    setCourses(courses.filter(course => course.id !== id));
    setMessage("课程已删除");
    
    setTimeout(() => {
      setMessage("");
    }, 3000);
  };
  
  const handleViewQuiz = (courseId: number) => {
    router.push(`/speaker/quiz/${courseId}`);
  };

  const handleExitCourse = async (courseId: number) => {
    if (!currentUser?.id) return;
    
    if (!confirm("确定要退出该课程的演讲者角色吗？")) {
      return;
    }
    
    try {
      const response = await fetch('/api/courses/speaker/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          speakerId: currentUser.id
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // 更新本地课程列表，重新获取最新数据
        fetchMySpeakerCourses(currentUser.id);
        setMessage("已成功退出课程");
      } else {
        setMessage(result.error || "退出课程失败");
      }
      
      // 3秒后清除消息
      setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (error) {
      console.error("退出课程时发生错误:", error);
      setMessage("网络错误，请稍后重试");
    }
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

  // 渲染统计图表（柱状图）
  const renderChart = (result: SurveyResult) => {
    const maxCount = Math.max(...result.options.map(option => option.count));
    
    return (
      <div className="mb-8 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-medium mb-4">{result.questionText}</h3>
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
                      style={{ width: `${(option.count / maxCount) * 100}%` }}
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
    );
  };

  // 课程变更时清除选中的问卷
  useEffect(() => {
    setSelectedQuiz(null);
  }, [selectedCourse]);

  // 统计tab下，选择课程后拉取统计数据和问卷列表
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

  // 修改为接受参数的函数，方便初始化时调用
  const checkNewStatisticsNotification = async (userId?: number) => {
    // 如果没有传入userId，则使用当前用户的id
    const id = userId || currentUser?.id;
    if (!id) return;

    try {
      console.log('检查统计通知，用户ID:', id);
      const res = await fetch(`/api/quiz/statistics/notify?userId=${id}`);
      
      if (!res.ok) {
        console.error('获取统计通知失败:', res.status, res.statusText);
        return;
      }
      
      const data = await res.json();
      console.log('统计通知数据:', data);

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
    } catch (error) {
      console.error('检查统计通知时发生错误:', error);
    }
  };

  // 删除或修改此useEffect，因为我们在登录后就已经设置了检查
  // 在activeTab变为"statistics"时不需要重新设置interval
  useEffect(() => {
    // 不再需要这个Effect，登录时已经设置好了
    // 保留空函数以便进行代码修改
  }, [activeTab, currentUser]);

  const handleCloseStatisticsNotification = () => {
    setShowStatisticsNotification(false);
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
  <div>
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold text-gray-800">我的课程</h1>
    </div>
    
    {message && (
      <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-md">
        {message}
      </div>
    )}
    
    {courses.length === 0 ? (
      <p className="text-gray-500">您还没有任何课程</p>
    ) : (
      <div className="grid gap-6 md:grid-cols-2">
        {courses.map(course => (
          <div key={course.id} className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            {/* 顶部装饰条 */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300"></div>
            
            {/* 课程标题 */}
            <h3 className="text-xl font-medium mb-2 text-gray-800">{course.title}</h3>
            
            {/* 课程基础信息与课程码放在同一行，使用相同样式 */}
            <div className="flex items-center flex-wrap text-sm text-gray-500 mb-4">
              <span className="font-medium mr-2">课程码:</span>
              <span className="bg-gray-100 px-3 py-1 rounded-md font-mono mr-4">{course.courseCode}</span>
              
              <span className="font-medium mr-2">组织者:</span>
              <span className="bg-gray-100 px-3 py-1 rounded-md mr-4">{course.organizer}</span>
              
              {course.speakerName && (
                <>
                  <span className="font-medium mr-2">演讲者:</span>
                  <span className="bg-gray-100 px-3 py-1 rounded-md mr-4">{course.speakerName}</span>
                </>
              )}
              
              <span className="font-medium mr-2">成员数:</span>
              <span className="bg-gray-100 px-3 py-1 rounded-md">{course.memberCount || 0}</span>
            </div>

            {/* 操作按钮（保持原有样式） */}
            <div className="grid grid-cols-1 gap-3">
              <button 
                className="w-full py-2 px-3 bg-transparent hover:bg-gray-100 text-red-600 rounded-md transition-colors border border-gray-300"
                onClick={() => handleExitCourse(course.id)}
              >
                退出课程
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
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