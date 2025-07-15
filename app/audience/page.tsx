"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Course {
  id: number;
  title: string;
  organizer: string;
  courseCode: string;
}

interface Comment {
  id: number;
  userId: string;
  username: string;
  courseId: number;
  text: string;
  timestamp: string;
}

export default function AudiencePage() {
  const [activeTab, setActiveTab] = useState("courses");
  const [courseCode, setCourseCode] = useState("");
  const [message, setMessage] = useState("");
  const [courses, setCourses] = useState<Course[]>([
    { id: 1, title: "Web开发基础", organizer: "组织者1", courseCode: "WEB001" },
    { id: 2, title: "数据结构与算法", organizer: "组织者2", courseCode: "DSA002" },
  ]);
  
  // 留言相关状态
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Comment[]>([
    { id: 1, userId: "user1", username: "张三", courseId: 1, text: "这节课讲得非常好！", timestamp: "2023-10-01 14:30" },
    { id: 2, userId: "user2", username: "李四", courseId: 1, text: "请问什么时候会有下一节课？", timestamp: "2023-10-01 15:45" },
    { id: 3, userId: "user1", username: "张三", courseId: 2, text: "这个算法有点难理解", timestamp: "2023-10-02 09:20" },
  ]);
  
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");

  useEffect(() => {
    // 检查本地存储中是否有用户信息
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
    const user = JSON.parse(savedUser);
    setNewUsername(user.username); // 初始化表单用户名
    //const savedUser = localStorage.getItem('currentUser');
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
    } catch (error) {
      localStorage.removeItem('currentUser');
      router.push("/");
    }
  }}, [router]);
  useEffect(() => {
  const loadEnrolledCourses = async () => {
    if (!currentUser?.id) return;
    
    try {
      const res = await fetch(`/api/courses/enroll?userId=${currentUser.id}`);
      const data = await res.json();
      if (res.ok) setCourses(data.courses);
    } catch (error) {
      console.error("加载课程失败:", error);
    }
  };

  loadEnrolledCourses();
}, [currentUser?.id]); // 依赖用户ID


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
  const handleLeaveCourse = (id: number) => {
    setCourses(courses.filter(course => course.id !== id));
    setMessage("已退出课程");
    
    // 3秒后清除消息
    setTimeout(() => {
      setMessage("");
    }, 3000);
  };
  
  const viewQuiz = (courseId: number) => {
    router.push(`/audience/quiz/${courseId}`);
  };

  // 处理留言功能
  const handleComment = (courseId: number) => {
    setSelectedCourseId(courseId);
    setShowCommentModal(true);
  };

  // 提交留言
  const submitComment = () => {
    if (!commentText.trim()) {
      return;
    }
    
    // 添加新留言
    const newComment: Comment = {
      id: Date.now(),
      userId: currentUser.id || currentUser.username,
      username: currentUser.username,
      courseId: selectedCourseId as number,
      text: commentText,
      timestamp: new Date().toLocaleString()
    };
    
    setComments([...comments, newComment]);
    
    // 重置状态
    setCommentText("");
    setMessage("留言已发送");
    setTimeout(() => {
      setMessage("");
    }, 3000);
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
                    <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                      <span className="font-medium">课程码:</span>
                      <span className="bg-gray-100 px-3 py-1 rounded-md font-mono">{course.courseCode}</span>
                    </div>
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
                      <div 
                        className={`max-w-[80%] p-3 rounded-lg ${
                          isCurrentUserComment(comment) 
                            ? 'bg-gray-800 text-white ml-auto' 
                            : 'bg-gray-100 text-gray-800 mr-auto'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1 text-xs">
                          <span className="font-medium">{isCurrentUserComment(comment) ? '我' : comment.username}</span>
                          <span className="opacity-70">{comment.timestamp}</span>
                        </div>
                        <p>{comment.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  暂无留言
                </div>
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
    </div>
  );
} 