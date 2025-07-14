"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  username: string;
  role: string;
}

interface Course {
  id: number;
  title: string;
  instructor: string;
  category: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState<User[]>([
    { id: 1, username: "user1", role: "听众" },
    { id: 2, username: "user2", role: "演讲者" },
    { id: 3, username: "speaker1", role: "演讲者" },
    { id: 4, username: "organizer1", role: "组织者" },
  ]);
  
  const [courses, setCourses] = useState<Course[]>([
    { id: 1, title: "Web开发基础", instructor: "张教授", category: "技术" },
    { id: 2, title: "数据结构与算法", instructor: "李教授", category: "计算机科学" },
    { id: 3, title: "移动应用开发", instructor: "王教授", category: "技术" },
  ]);
  
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");

  useEffect(() => {
    // 防止重定向循环
    if (isRedirecting) return;
    
    // 检查本地存储中是否有管理员信息
    const admin = localStorage.getItem("admin");
    const savedUser = localStorage.getItem('currentUser');
    
    // 只有当两者都不存在时才重定向
    if (!admin && !savedUser) {
      setIsRedirecting(true);
      router.push("/?from=admin");
      return;
    }
    
    // 如果有savedUser但没有admin，检查用户是否是admin角色
    if (!admin && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        if (user.role !== "admin") {
          setIsRedirecting(true);
          router.push("/?from=admin");
          return;
        }
        setCurrentUser(user);
        setNewUsername(user.username);
      } catch (error) {
        setIsRedirecting(true);
        router.push("/?from=admin");
      }
    } else if (admin) {
      // 如果有admin但没有currentUser，创建一个默认的currentUser
      const defaultAdminUser = {
        id: 0,
        username: "admin",
        role: "admin",
        password: "admin123" // 仅作示例，实际应用中不应存储明文密码
      };
      setCurrentUser(defaultAdminUser);
      setNewUsername(defaultAdminUser.username);
    }
  }, [router, isRedirecting]);

  const handleLogout = () => {
    localStorage.removeItem("admin");
    localStorage.removeItem("currentUser");
    router.push("/");
  };
  
  const deleteUser = (id: number) => {
    setUsers(users.filter(user => user.id !== id));
  };

  const deleteCourse = (id: number) => {
    setCourses(courses.filter(course => course.id !== id));
  };

  const handleUpdateUsername = () => {
    if (!newUsername.trim()) {
      setSettingsMessage("用户名不能为空");
      return;
    }

    // 更新用户名
    const updatedUser = { ...currentUser, username: newUsername };
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    setSettingsMessage("用户名更新成功");
    
    // 3秒后清除消息
    setTimeout(() => {
      setSettingsMessage("");
    }, 3000);
  };

  const handleUpdatePassword = () => {
    // 简单的密码验证
    if (!currentPassword || !newPassword || !confirmPassword) {
      setSettingsMessage("请填写所有密码字段");
      return;
    }

    if (currentPassword !== currentUser.password) {
      setSettingsMessage("当前密码不正确");
      return;
    }

    if (newPassword !== confirmPassword) {
      setSettingsMessage("两次输入的新密码不一致");
      return;
    }

    // 更新密码
    const updatedUser = { ...currentUser, password: newPassword };
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSettingsMessage("密码更新成功");
    
    // 3秒后清除消息
    setTimeout(() => {
      setSettingsMessage("");
    }, 3000);
  };

  if (!currentUser) {
    return <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800">加载中...</div>;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800">
      {/* 左侧导航栏 */}
      <div className="w-64 bg-white p-5 flex flex-col border-r border-gray-200 shadow-sm">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-gray-800">POP QUIZ 管理</h1>
        </div>
        
        <nav className="flex-1">
          <ul className="space-y-1">
            <li>
              <button 
                className={`w-full p-3 text-left rounded-md transition-colors ${activeTab === "users" ? "bg-gray-100 text-gray-800 font-medium border-l-4 border-gray-400" : "text-gray-600 hover:bg-gray-50"}`}
                onClick={() => setActiveTab("users")}
              >
                用户管理
              </button>
            </li>
            <li>
              <button 
                className={`w-full p-3 text-left rounded-md transition-colors ${activeTab === "courses" ? "bg-gray-100 text-gray-800 font-medium border-l-4 border-gray-400" : "text-gray-600 hover:bg-gray-50"}`}
                onClick={() => setActiveTab("courses")}
              >
                课程管理
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
        {activeTab === "users" ? (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">用户管理</h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户名</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{user.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{user.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{user.role}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button 
                          className="bg-transparent hover:bg-gray-100 text-red-600 px-3 py-1 rounded transition-colors border border-gray-300"
                          onClick={() => deleteUser(user.id)}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === "courses" ? (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">课程管理</h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">课程名称</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">讲师</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分类</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {courses.map(course => (
                    <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{course.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{course.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{course.instructor}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{course.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button 
                          className="bg-transparent hover:bg-gray-100 text-red-600 px-3 py-1 rounded transition-colors border border-gray-300"
                          onClick={() => deleteCourse(course.id)}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
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
                  onClick={handleUpdateUsername}
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
                  onClick={handleUpdatePassword}
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
    </div>
  );
}