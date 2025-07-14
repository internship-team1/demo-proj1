"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface User {
  id: number;
  username: string;
  password?: string;
  role: string;
}

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState("audience");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();

  // 检查本地存储中是否有用户信息
  useEffect(() => {
    // 防止重定向循环
    if (isRedirecting) return;
    
    // 检查URL是否包含来自admin的重定向标记
    const url = new URL(window.location.href);
    if (url.searchParams.get('from') === 'admin') {
      // 如果是从admin页面重定向过来的，不再尝试重定向回去
      return;
    }
    
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        // 直接根据用户角色重定向，不设置状态
        setIsRedirecting(true);
        if (user.role === "admin") {
          router.push("/admin");
        } else if (user.role === "audience") {
          router.push("/audience");
        } else if (user.role === "speaker") {
          router.push("/speaker");
        } else if (user.role === "organizer") {
          router.push("/organizer");
        }
      } catch (error) {
        localStorage.removeItem('currentUser');
      }
    } else {
      // 只有在没有用户信息时才检查管理员信息
      const admin = localStorage.getItem("admin");
      if (admin) {
        setIsRedirecting(true);
        router.push("/admin");
      }
    }
  }, [router, isRedirecting]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    
    // 检查是否是管理员登录
    if (username === "gly" && password === "123") {
      localStorage.setItem("admin", username);
      router.push("/admin");
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 保存用户信息到本地存储
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        
        // 根据用户角色重定向，不设置状态直接跳转
        if (data.user.role === "admin") {
          localStorage.setItem("admin", data.user.username);
          router.push("/admin");
        } else if (data.user.role === "audience") {
          router.push("/audience");
        } else if (data.user.role === "speaker") {
          router.push("/speaker");
        } else if (data.user.role === "organizer") {
          router.push("/organizer");
        }
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage("登录失败，请稍后再试");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, role }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(data.message);
        setIsLogin(true); // 切换到登录页面
        setTimeout(() => {
          setMessage("");
        }, 3000);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage("注册失败，请稍后再试");
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUsername("");
    setPassword("");
    setMessage("");
    localStorage.removeItem('currentUser');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4 relative overflow-hidden">
      {/* 超大型POP QUIZ背景 */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none overflow-visible">
        <div className="relative">
          {/* 主文字 */}
          <h1 className="text-[20vw] md:text-[32vw] font-black text-gray-800 select-none tracking-tighter leading-none">
            POP
            <span className="block -mt-[0.25em]">QUIZ</span>
          </h1>
          
          {/* 外层描边 */}
          <h1 className="text-[20vw] md:text-[32vw] font-black text-transparent absolute inset-0 select-none tracking-tighter leading-none" 
              style={{ WebkitTextStroke: '8px rgba(50,50,50,0.3)' }}>
            POP
            <span className="block -mt-[0.25em]">QUIZ</span>
          </h1>
        </div>
      </div>
      
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-1/4 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute right-1/4 top-1/3 w-96 h-96 bg-gray-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute left-1/3 bottom-1/4 w-96 h-96 bg-gray-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-md p-8 space-y-8 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200 relative z-10">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300"></div>
        
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-800">Welcome</h1>
          <p className="mt-2 text-sm text-gray-500">
            {isLogin ? "登录您的账户" : "创建新账户"}
          </p>
          {message && (
            <p className={`mt-2 text-sm ${message.includes("成功") ? "text-green-600" : "text-red-600"}`}>
              {message}
            </p>
          )}
        </div>
        
        <div className="flex space-x-4 mb-4">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors border ${
              isLogin 
                ? "bg-transparent text-gray-800 border-gray-400" 
                : "bg-transparent text-gray-600 border-gray-300 hover:bg-gray-100"
            }`}
            onClick={() => setIsLogin(true)}
          >
            登录
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors border ${
              !isLogin 
                ? "bg-transparent text-gray-800 border-gray-400" 
                : "bg-transparent text-gray-600 border-gray-300 hover:bg-gray-100"
            }`}
            onClick={() => setIsLogin(false)}
          >
            注册
          </button>
        </div>

        {isLogin ? (
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  用户名
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  密码
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-800 bg-transparent hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors disabled:opacity-50"
              >
                {isLoading ? "登录中..." : "登录"}
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleRegister}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  用户名
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  密码
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  角色
                </label>
                <div className="mt-1 grid grid-cols-3 gap-3">
                  <div 
                    className={`border rounded-md px-3 py-2 flex items-center justify-center cursor-pointer transition-colors ${role === "organizer" ? "bg-gray-100 border-gray-400 text-gray-800" : "border-gray-300 hover:bg-gray-50"}`}
                    onClick={() => setRole("organizer")}
                  >
                    <span className="text-sm">组织者</span>
                  </div>
                  <div 
                    className={`border rounded-md px-3 py-2 flex items-center justify-center cursor-pointer transition-colors ${role === "speaker" ? "bg-gray-100 border-gray-400 text-gray-800" : "border-gray-300 hover:bg-gray-50"}`}
                    onClick={() => setRole("speaker")}
                  >
                    <span className="text-sm">演讲者</span>
                  </div>
                  <div 
                    className={`border rounded-md px-3 py-2 flex items-center justify-center cursor-pointer transition-colors ${role === "audience" ? "bg-gray-100 border-gray-400 text-gray-800" : "border-gray-300 hover:bg-gray-50"}`}
                    onClick={() => setRole("audience")}
                  >
                    <span className="text-sm">听众</span>
                  </div>
                </div>
                <input type="hidden" name="role" value={role} />
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-800 bg-transparent hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors disabled:opacity-50"
              >
                {isLoading ? "注册中..." : "注册"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
