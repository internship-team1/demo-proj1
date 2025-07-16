"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

interface User {
  id: number;
  username: string;
  role: string;
  isSpeaker?: boolean;
}

interface Course {
  id: number;
  title: string;
  organizer: string;
  members: number;
  courseCode: string;
}

export default function CourseManagementPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = Number(params.courseId);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [members, setMembers] = useState<User[]>([]);
  const [message, setMessage] = useState("");
  const [speakerUsername, setSpeakerUsername] = useState("");
  
  // 加载课程和成员数据
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
      
      // 用API获取课程数据
      fetch(`/api/course?id=${courseId}`)
        .then(res => res.json())
        .then(data => {
          // 如果 data 是数组，找出对应课程
          const found = Array.isArray(data) ? data.find(c => c.id === courseId) : data;
          if (found && found.id === courseId) {
            setCourse(found);
            setCourseTitle(found.title);
          } else {
            router.push("/organizer");
          }
        })
        .catch(() => router.push("/organizer"));
      
      // 获取课程成员（听众）
      fetch(`/api/course/${courseId}/members`)
        .then(res => res.json())
        .then((data: User[]) => {
          setMembers(data);
          // 设置当前演讲者
          const currentSpeaker = data.find(m => m.isSpeaker);
          if (currentSpeaker) {
            setSpeakerUsername(currentSpeaker.username);
          } else {
            setSpeakerUsername("");
          }
        })
        .catch(() => setMembers([]));
      
    } catch (error) {
      router.push("/organizer");
    }
  }, [router, courseId]);

  const handleUpdateCourse = async () => {
    if (!courseTitle.trim()) {
      setMessage("课程标题不能为空");
      return;
    }
    
    // 更新课程标题
    if (course) {
      const updatedCourse = { ...course, title: courseTitle };
      setCourse(updatedCourse);
      setMessage("课程名称已更新");
      
      setTimeout(() => {
        setMessage("");
      }, 3000);
      
      try {
        await fetch("/api/course", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: courseId, title: courseTitle }),
        });
      } catch (error) {
        setMessage("更新课程名称时出错");
      }
    }
  };
  
  const handleSetSpeaker = async () => {
    if (!speakerUsername.trim()) {
      setMessage("请输入用户名");
      return;
    }

    // 先检查该用户是否存在且角色是否为speaker
    try {
      // 通过用户名查询用户
      const checkUserResponse = await fetch(`/api/users/check-role?username=${speakerUsername}`);
      const userData = await checkUserResponse.json();
      
      if (!checkUserResponse.ok || !userData.exists) {
        setMessage("用户不存在");
        return;
      }
      
      // 检查用户角色是否为speaker
      if (userData.role !== "speaker") {
        setMessage("只能将演讲者(speaker)角色的用户设置为课程演讲者");
        return;
      }

      // 查找该用户是否已在课程成员中
      let member = members.find(m => m.username === speakerUsername);
      let newMemberAdded = false;
      
      if (!member) {
        // 不存在则先添加成员
        try {
          const addRes = await fetch(`/api/course/${courseId}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: speakerUsername }),
          });
          if (!addRes.ok) {
            setMessage("添加成员失败，请稍后重试");
            return;
          }
          newMemberAdded = true;
        } catch (error) {
          setMessage("添加成员时出错");
          return;
        }
      }

      // 重新获取成员列表，确保有最新成员
      const res = await fetch(`/api/course/${courseId}/members`);
      const data: User[] = await res.json();
      setMembers(data);
      
      // 查找新成员
      member = data.find(m => m.username === speakerUsername);
      if (!member) {
        setMessage("添加成员后仍未找到该用户");
        return;
      }
      
      // 设置演讲者
      await fetch("/api/course", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: courseId, speakerId: member.id }),
      });
      setMessage(`已将 \"${speakerUsername}\" 设置为演讲者${newMemberAdded ? "（已自动加入课程）" : ""}`);
      
      // 再次刷新成员列表，刷新 isSpeaker 状态
      const res2 = await fetch(`/api/course/${courseId}/members`);
      const data2 = await res2.json();
      setMembers(data2);
      
      setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (error) {
      console.error("设置演讲者时出错:", error);
      setMessage("设置演讲者时出错");
    }
  };
  
  const handleRemoveMember = async (userId: number) => {
    try {
      // 调用后端API移除成员
      await fetch(`/api/course/${courseId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, userId }),
      });
      setMessage("成员已移除");
      // 刷新成员列表
      const res = await fetch(`/api/course/${courseId}/members`);
      const data = await res.json();
      setMembers(data);
      // 更新课程成员数量
      if (course) {
        const updatedCourse = { ...course, members: data.length };
        setCourse(updatedCourse);
      }
      setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (error) {
      setMessage("移除成员时出错");
    }
  };
  
  const handleGoBack = () => {
    router.push("/organizer");
  };

  if (!currentUser || !course) {
    return <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-8">
          <button 
            className="flex items-center text-gray-600 hover:text-gray-800"
            onClick={handleGoBack}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回课程列表
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-800">{course.title}</h1>
          </div>
          
          {/* 课程信息 */}
          <div className="p-6 border-b border-gray-200">
            
                         <div className="mb-6">
               <div className="flex items-center space-x-3">
                 <label className="block text-sm font-medium text-gray-700">课程码:</label>
                 <span className="bg-gray-100 px-3 py-1 rounded-md font-mono text-lg">{course.courseCode}</span>
               </div>
             </div>
            
            <div className="flex flex-col md:flex-row md:items-end space-y-4 md:space-y-0 md:space-x-4">
              <div className="flex-1">
                <label className="block text-sm text-gray-700 mb-1">课程名称</label>
                <input 
                  type="text" 
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <div>
                <button 
                  className="px-4 py-2 bg-transparent text-gray-800 rounded-md hover:bg-gray-100 transition-colors border border-gray-300"
                  onClick={handleUpdateCourse}
                >
                  更新课程名称
                </button>
              </div>
            </div>
          </div>
          
          {/* 设置演讲者 */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-end space-y-4 md:space-y-0 md:space-x-4">
              <div className="flex-1">
                <label className="block text-sm text-gray-700 mb-1">演讲者</label>
                <input 
                  type="text" 
                  value={speakerUsername}
                  onChange={(e) => setSpeakerUsername(e.target.value)}
                  placeholder="输入用户名"
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <div>
                <button 
                  className="px-4 py-2 bg-transparent text-gray-800 rounded-md hover:bg-gray-100 transition-colors border border-gray-300"
                  onClick={handleSetSpeaker}
                >
                  设置演讲者
                </button>
              </div>
            </div>
          </div>
          
          {/* 成员列表 */}
          <div className="p-6">
            <h2 className="text-xl font-medium mb-4 text-gray-800">成员 ({members.length})</h2>
            
            {members.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">用户名</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">角色</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">状态</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {members.map(member => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{member.username}</td>
                        <td className="px-4 py-3">{member.role === "audience" ? "听众" : member.role}</td>
                        <td className="px-4 py-3">
                          {member.isSpeaker && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              演讲者
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button 
                            className="text-red-600 hover:text-red-800 text-sm"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            移除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
                              <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-600">暂无成员</p>
                </div>
            )}
          </div>
        </div>
        
        {message && (
          <div className={`p-4 rounded-md mb-4 ${message.includes("错误") ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
} 