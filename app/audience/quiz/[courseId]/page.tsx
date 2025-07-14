"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

interface Quiz {
  id: number;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  isActive: boolean;
}

export default function CourseQuizPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId;
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([
    {
      id: 1,
      title: "第一次课堂测验",
      description: "Web开发基础知识测验",
      startTime: "2023-05-01T09:00:00",
      endTime: "2023-05-01T10:00:00",
      isActive: true
    },
    {
      id: 2,
      title: "第二次课堂测验",
      description: "CSS和JavaScript基础",
      startTime: "2023-05-08T09:00:00",
      endTime: "2023-05-08T10:00:00",
      isActive: true
    }
  ]);

  useEffect(() => {
    // 检查用户登录状态
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) {
      router.push("/");
      return;
    }
    
    try {
      const user = JSON.parse(savedUser);
      if (user.role !== "audience") {
        router.push("/");
        return;
      }
      setCurrentUser(user);
      
      // 在实际应用中，这里会根据courseId加载相关的问卷数据
      // fetchQuizzes(courseId);
    } catch (error) {
      localStorage.removeItem('currentUser');
      router.push("/");
    }
  }, [courseId, router]);

  const handleStartQuiz = (quizId: number) => {
    // 在实际应用中，这里会导航到具体的问卷答题页面
    alert(`开始答题: ${quizId}`);
    // router.push(`/audience/quiz/${courseId}/${quizId}`);
  };

  const handleViewResults = (quizId: number) => {
    // 在实际应用中，这里会导航到问卷结果页面
    alert(`查看结果: ${quizId}`);
    // router.push(`/audience/quiz/${courseId}/${quizId}/results`);
  };

  if (!currentUser) {
    return <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 p-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-8">
          <button 
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            onClick={() => router.push('/audience')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回课程列表
          </button>
        </div>
        
        <h1 className="text-3xl font-bold mb-2 text-gray-800">课程问卷</h1>
        <p className="text-gray-500 mb-8">课程ID: {courseId}</p>
        
        {quizzes.length > 0 ? (
          <div className="space-y-6">
            {quizzes.map(quiz => (
              <div key={quiz.id} className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300"></div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-medium text-gray-800">{quiz.title}</h3>
                    {quiz.description && (
                      <p className="text-gray-600 mt-1">{quiz.description}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${quiz.isActive ? "bg-green-100 text-green-800 border border-green-200" : "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                    {quiz.isActive ? "进行中" : "已结束"}
                  </span>
                </div>
                
                {quiz.startTime && quiz.endTime && (
                  <div className="flex space-x-4 text-sm text-gray-500 mb-4">
                    <span>开始: {new Date(quiz.startTime).toLocaleString()}</span>
                    <span>结束: {new Date(quiz.endTime).toLocaleString()}</span>
                  </div>
                )}
                
                <div className="flex space-x-4">
                  <button 
                    className="py-2 px-4 bg-transparent hover:bg-gray-100 text-gray-800 rounded-md transition-colors border border-gray-300"
                    onClick={() => handleStartQuiz(quiz.id)}
                  >
                    开始答题
                  </button>
                  <button 
                    className="py-2 px-4 bg-transparent hover:bg-gray-100 text-gray-600 rounded-md transition-colors border border-gray-300"
                    onClick={() => handleViewResults(quiz.id)}
                  >
                    查看结果
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-12 bg-gray-50 rounded-lg border border-gray-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300"></div>
            <p className="text-gray-600">该课程暂无问卷</p>
          </div>
        )}
      </div>
    </div>
  );
} 