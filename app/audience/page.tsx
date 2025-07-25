"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";


interface Course {
  id: number;
  title: string;
  courseCode: string;
  organizer: string;  // 保持原有字段
  organizerName?: string; // 新增字段
  speaker?: string;   // 新增字段
  audienceCount?: number; // 新增字段
  joinedAt?: string; 
}

interface Comment {
  id: number;
  userId: string;
  username: string;
  courseId: number;
  text: string;
  timestamp: string;
}

// 添加全局定时器变量声明
declare global {
  interface Window {
    quizCheckInterval: NodeJS.Timeout | null;
  }
}

export default function AudiencePage() {
  const [activeTab, setActiveTab] = useState("courses");
  const [courseCode, setCourseCode] = useState("");
  const [message, setMessage] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  
  // 添加定时器引用状态
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(null);
  
  // 留言相关状态
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [newQuizNotifications, setNewQuizNotifications] = useState<Array<{
    quizId: number;
    quizTitle: string;
    courseId: number;
    courseTitle: string;
  }>>([]);
  const [showNewQuizAlert, setShowNewQuizAlert] = useState(false);

// 添加检查新问卷的函数
const checkNewQuizzes = async (userId?: number, coursesList?: Course[]) => {
  // 使用提供的参数或者当前状态
  const id = userId || currentUser?.id;
  const courseItems = coursesList || courses;
  
  if (!id || courseItems.length === 0) return;
  
  try {
    const params = new URLSearchParams({
      userId: id.toString(),
      courseIds: courseItems.map(c => c.id).join(',')
    });

    const res = await fetch(`/api/quiz/recent?${params}`);
    const data = await res.json();
    
    if (data.hasNewQuizzes && data.quizzes && data.quizzes.length > 0) {
      setNewQuizNotifications(data.quizzes);
      setShowNewQuizAlert(true);
      console.log("显示新问卷通知:", data.quizzes);
    }
  } catch (error) {
    console.error('检查新问卷失败:', error);
  }
};

// 组件中添加调试监听
useEffect(() => {
  console.log('弹窗状态变化:', showNewQuizAlert);
}, [showNewQuizAlert]);

  useEffect(() => {
    // 检查本地存储中是否有用户信息
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) {
      router.push("/");
      return;
    }
    
    try {
      const user = JSON.parse(savedUser);
      // 确保只有听众角色可以访问此页面
      if (user.role !== "audience") {
        router.push("/");
        return;
      }
      setCurrentUser(user);
      setNewUsername(user.username);
    
    // 加载课程后立即检查新问卷通知
    loadEnrolledCourses(user.id);
    } catch (error) {
      localStorage.removeItem('currentUser');
      router.push("/");
    }
}, [router]);

  // 修改加载课程函数，加载后立即检查新问卷
  const loadEnrolledCourses = async (userId: number) => {
    if (!userId) return;
    
    try {
      const res = await fetch(`/api/courses/enroll?userId=${userId}`);
      const data = await res.json();
      if (res.ok) {
        setCourses(data.courses);
        
        // 课程加载成功后，立即检查是否有新问卷
        if (data.courses && data.courses.length > 0) {
          // 确保courses数据已经设置好后才检查
          setTimeout(() => {
            checkNewQuizzes(userId, data.courses);
            
            // 设置定期检查
            const timer = setInterval(() => checkNewQuizzes(), 30000);
            // 存储timer以便在组件卸载时清除
            setCheckInterval(timer);
          }, 500);
        }
      }
    } catch (error) {
      console.error("加载课程失败:", error);
    }
  };

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
        setCheckInterval(null);
      }
    };
  }, [checkInterval]);

  useEffect(() => {
    console.log('【DEBUG】当前状态:', {
      activeTab,
      userId: currentUser?.id,
      courseCount: courses.length,
      lastCheck: localStorage.getItem('lastQuizCheck')
    })
  }, [activeTab, currentUser, courses])

 const fetchUserCourses = async () => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/courses/enroll', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error('获取课程失败');
    
    const courses = await response.json();
    setCourses(courses);
  } catch (error) {
    setMessage('获取课程列表失败');
    setTimeout(() => setMessage(''), 3000);
  }
};

// 加入课程
const handleJoinCourse = async () => {
  if (!courseCode.trim() || !currentUser?.id) {
    setMessage("请输入课程码并确保已登录");
    return;
  }

  try {
    const response = await fetch('/api/courses/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        courseCode: courseCode.trim(),
        userId: currentUser.id // 确保使用Prisma中的用户ID
      })
    });

    const result = await response.json();
    
    if (!response.ok) throw new Error(result.error || '加入失败');

    // 更新前端状态
    setCourses(prev => [...prev, result.course]);
    setMessage(`成功加入: ${result.course.title}`);

  } catch (error: any) {
    setMessage(error.message.includes("已经加入") 
      ? "您已加入该课程"
      : "加入失败，请重试");
  } finally {
    setTimeout(() => setMessage(""), 3000);
  }
};

const handleLeaveCourse = async (courseId: number) => {
  try {
    const res = await fetch(`/api/courses/enroll?userId=${currentUser?.id}&courseId=${courseId}`, {
      method: 'DELETE'
    });
    
    if (!res.ok) throw new Error('退出失败');
    
    setCourses(prev => prev.filter(c => c.id !== courseId));
    setMessage("已退出课程");
  } catch (error) {
    setMessage("退出失败");
  }
  
};
  
  const viewQuiz = (courseId: number) => {
    router.push(`/audience/quiz/${courseId}`);
  };

 const handleComment = async (courseId: number) => {
  setSelectedCourseId(courseId);
  try {
    const res = await fetch(`/api/comments?courseId=${courseId}`);
    const apiComments = await res.json();
    
    // 转换API数据为前端兼容格式
    const adaptedComments = apiComments.map((apiComment: any) => ({
      id: apiComment.id,
      userId: String(apiComment.userId), // 确保是string类型
      username: apiComment.user?.username || '未知用户',
      courseId: apiComment.courseId,
      text: apiComment.content, // 关键：将content映射到text
      timestamp: apiComment.createdAt
    }));
    
    setComments(adaptedComments);
    setShowCommentModal(true);
  } catch (error) {
    console.error("加载留言失败:", error);
  }
};

const submitComment = async () => {
  if (!commentText.trim() || !selectedCourseId || !currentUser?.id) return;

  try {
    const response = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: commentText, // API需要content字段
        courseId: selectedCourseId,
        userId: Number(currentUser.id) // 确保是number类型
      })
    });

    if (response.ok) {
      setCommentText("");
      // 重新加载最新留言
      await handleComment(selectedCourseId); // 复用上面的加载逻辑
      setMessage("留言已发送");
    }
  } catch (error) {
    setMessage("留言发送失败");
  }
};

  // 获取当前课程的评论
  const getCurrentCourseComments = () => {
    return comments.filter(comment => comment.courseId === selectedCourseId);
  };
  
  // 判断评论是否来自当前用户
  const isCurrentUserComment = (comment: Comment) => {
    return comment.userId === (currentUser.id || currentUser.username);
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
                我的课程
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
        {activeTab === "courses" ? (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">我的课程</h2>
            
            {/* 加入课程区域 */}
            <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300"></div>
              <div className="flex space-x-3">
                <input 
                  type="text" 
                  placeholder="输入课程码" 
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
                <button 
                  className="px-4 py-2 bg-transparent text-gray-800 rounded-md hover:bg-gray-100 transition-colors border border-gray-300"
                  onClick={handleJoinCourse}
                >
                  加入课程
                </button>
              </div>
              {message && (
                <p className={`mt-3 text-sm ${message.includes("成功") || message.includes("发送") ? "text-green-600" : "text-red-600"}`}>
                  {message}
                </p>
              )}
            </div>
            
            {/* 课程列表 */}
{courses.length > 0 ? (
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
          <span className="bg-gray-100 px-3 py-1 rounded-md mr-4">{course.organizer}</span>
          
          {course.speaker && (
            <>
              <span className="font-medium mr-2">演讲者:</span>
              <span className="bg-gray-100 px-3 py-1 rounded-md mr-4">{course.speaker}</span>
            </>
          )}
          
          <span className="font-medium mr-2">成员数:</span>
          <span className="bg-gray-100 px-3 py-1 rounded-md">{course.audienceCount}人</span>
        </div>

        {/* 原有的操作按钮保持不变 */}
        <div className="grid grid-cols-3 gap-2">
          <button 
            className="py-2 px-3 bg-transparent hover:bg-gray-100 text-gray-800 rounded-md transition-colors border border-gray-300 text-sm"
            onClick={() => viewQuiz(course.id)}
          >
            问卷
          </button>
          <button 
            className="py-2 px-3 bg-transparent hover:bg-gray-100 text-gray-800 rounded-md transition-colors border border-gray-300 text-sm"
            onClick={() => handleComment(course.id)}
          >
            留言
          </button>
          <button 
            className="py-2 px-3 bg-transparent hover:bg-gray-100 text-red-600 rounded-md transition-colors border border-gray-300 text-sm"
            onClick={() => handleLeaveCourse(course.id)}
          >
            退出
          </button>
        </div>
      </div>
    ))}
  </div>
) : (
  <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
    <p className="text-gray-600">您还没有加入任何课程</p>
  </div>
)}
          </div>
        ) : (
          // 设置选项卡内容
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">设置</h2>
            
            {/* 更新用户名 */}
            <div className="mb-8 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-medium mb-4 text-gray-800">更新用户名</h3>
              <div className="flex space-x-3">
                <input 
                  type="text" 
                  placeholder="新用户名" 
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
                <button 
                  className="px-4 py-2 bg-transparent text-gray-800 rounded-md hover:bg-gray-100 transition-colors border border-gray-300"
                  onClick={handleUpdateUsername}//
                >
                  更新
                </button>
              </div>
            </div>
            
            {/* 更新密码 */}
            <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-medium mb-4 text-gray-800">更新密码</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">当前密码</label>
                  <input 
                    type="password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
                <button 
                  className="px-4 py-2 bg-transparent text-gray-800 rounded-md hover:bg-gray-100 transition-colors border border-gray-300"
                  onClick={handleUpdatePassword}//
                >
                  更新密码
                </button>
              </div>
            </div>
            
            {settingsMessage && (
              <p className={`mt-4 text-sm ${settingsMessage.includes("成功") ? "text-green-600" : "text-red-600"}`}>
                {settingsMessage}
              </p>
            )}
          </div>
        )}
      </div>
      
      {/* 留言对话框 */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 relative">
            <button 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={() => setShowCommentModal(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h3 className="text-xl font-medium mb-4 text-gray-800">课程留言</h3>
            
            {/* 留言列表 */}
            <div className="max-h-96 overflow-y-auto mb-4 border border-gray-200 rounded-lg p-4">
              {getCurrentCourseComments().length > 0 ? (
  <div className="space-y-4">
    {getCurrentCourseComments().map(comment => (
  <div 
    key={comment.id} 
    className={`flex ${isCurrentUserComment(comment) ? 'justify-end' : 'justify-start'}`}
  >
    <div className={`max-w-[80%] p-3 rounded-lg ${
      isCurrentUserComment(comment) 
        ? 'bg-gray-800 text-white ml-auto' 
        : 'bg-gray-100 text-gray-800 mr-auto'
    }`}>
      <div className="flex justify-between items-center mb-1 text-xs">
        <span className="font-medium">
          {isCurrentUserComment(comment) ? '我' : comment.username}
        </span>
        <span className="opacity-70">
          {new Date(comment.timestamp).toLocaleString()}
        </span>
      </div>
      <p>{comment.text}</p> {/* 直接使用text字段 */}
    </div>
  </div>
))}
  </div>
) : (
  <div className="text-center py-8 text-gray-500">暂无留言</div>
)}
            </div>
            
            {/* 发送留言 */}
            <div className="flex space-x-3">
              <textarea
                className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 h-20 resize-none"
                placeholder="请输入您的留言内容..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              ></textarea>
              <button 
                className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors self-end"
                onClick={submitComment}
              >
                发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新问卷提醒 */}
      {activeTab === "courses" && showNewQuizAlert && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg animate-pop-in max-w-md">
            <h3 className="text-xl font-bold mb-2">📝 新问卷通知</h3>
            
            {newQuizNotifications.length > 0 && (
              <div className="mb-4">
                <p className="mb-2">以下课程有新的问卷可供回答：</p>
                <ul className="list-disc pl-5 mb-3">
                  {/* 使用Set来确保课程不重复 */}
                  {Array.from(new Set(newQuizNotifications.map(n => n.courseId))).map((courseId) => {
                    const notification = newQuizNotifications.find(n => n.courseId === courseId);
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
                  setShowNewQuizAlert(false);
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