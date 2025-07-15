"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  username: string;
  role: string;
  createdAt: string;
}

interface Speaker {
  id: number;
  username: string;
  role: string;
}

interface Course {
  id: number;
  title: string;
  description: string | null;
  courseCode: string;
  createdAt: string;
  organizer: {
    id: number;
    username: string;
    role: string;
  };
  speaker: {
    id: number;
    username: string;
    role: string;
  } | null;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // 获取用户数据
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        throw new Error('获取用户数据失败');
      }
      const data = await response.json();
      setUsers(data);
      setError(null);
    } catch (err) {
      console.error('获取用户数据错误:', err);
      setError('获取用户数据失败，请刷新页面重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取课程数据
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/courses');
      if (!response.ok) {
        throw new Error('获取课程数据失败');
      }
      const data = await response.json();
      setCourses(data);
      setError(null);
    } catch (err) {
      console.error('获取课程数据错误:', err);
      setError('获取课程数据失败，请刷新页面重试');
    } finally {
      setLoading(false);
    }
  };

  // 检查登录状态和权限
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
        }
      } catch (error) {
        setIsRedirecting(true);
        router.push("/?from=admin");
      }
    }
  }, [router, isRedirecting]);

  // 加载数据
  useEffect(() => {
    // 根据当前标签页加载相应数据
    if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "courses") {
      fetchCourses();
    }
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem("admin");
    localStorage.removeItem("currentUser");
    router.push("/");
  };

  // 删除用户
  const deleteUser = async (id: number) => {
    if (!confirm("确定要删除该用户吗？此操作无法撤销。")) return;
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '删除用户失败');
      }

      // 成功删除后，刷新用户列表
      fetchUsers();
    } catch (err: any) {
      console.error('删除用户错误:', err);
      alert(err.message || '删除用户失败，请重试');
    }
  };

  // 删除课程
  const deleteCourse = async (id: number) => {
    if (!confirm("确定要删除该课程吗？此操作无法撤销，将删除课程相关的所有数据。")) return;
    
    try {
      const response = await fetch('/api/admin/courses', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseId: id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '删除课程失败');
      }

      // 成功删除后，刷新课程列表
      fetchCourses();
    } catch (err: any) {
      console.error('删除课程错误:', err);
      alert(err.message || '删除课程失败，请重试');
    }
  };

  // 格式化日期时间
  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 渲染加载中状态
  const renderLoading = () => (
    <div className="flex justify-center items-center h-64">
      <div className="text-xl text-gray-500">正在加载数据...</div>
    </div>
  );

  // 渲染错误状态
  const renderError = () => (
    <div className="flex justify-center items-center h-64">
      <div className="text-xl text-red-500">{error}</div>
      <button 
        className="ml-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        onClick={() => activeTab === "users" ? fetchUsers() : fetchCourses()}
      >
        重试
      </button>
    </div>
  );

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
        {error ? (
          renderError()
        ) : loading ? (
          renderLoading()
        ) : activeTab === "users" ? (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">用户管理</h2>
            {users.length > 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户名</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{user.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{user.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                            user.role === 'organizer' ? 'bg-green-100 text-green-800' :
                            user.role === 'speaker' ? 'bg-blue-100 text-blue-800' : 
                            'bg-gray-100 text-gray-800'}`}>
                            {user.role === 'admin' ? '管理员' : 
                             user.role === 'organizer' ? '组织者' :
                             user.role === 'speaker' ? '演讲者' : '听众'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{formatDateTime(user.createdAt)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button 
                            className={`bg-transparent hover:bg-gray-100 text-red-600 px-3 py-1 rounded transition-colors border border-gray-300
                              ${user.role === 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={() => deleteUser(user.id)}
                            disabled={user.role === 'admin'}
                            title={user.role === 'admin' ? '不能删除管理员账号' : '删除用户'}
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">暂无用户数据</div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">课程管理</h2>
            {courses.length > 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">课程名称</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">课程码</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">组织者</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">演讲者</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {courses.map(course => (
                      <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{course.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{course.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{course.courseCode}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{course.organizer.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                          {course.speaker ? course.speaker.username : '未指定'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{formatDateTime(course.createdAt)}</td>
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
            ) : (
              <div className="text-center py-10 text-gray-500">暂无课程数据</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 