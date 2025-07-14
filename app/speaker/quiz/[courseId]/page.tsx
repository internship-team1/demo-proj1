"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";

interface Question {
  id: number;
  text: string;
  options: {
    id: number;
    text: string;
    isCorrect: boolean;
  }[];
}

export default function SpeakerQuizManagement() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [course, setCourse] = useState<any>({ 
    id: parseInt(courseId), 
    title: `课程 ${courseId}`,
    description: "课程描述"
  });
  
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 1,
      text: "React 的核心概念是什么？",
      options: [
        { id: 1, text: "组件化", isCorrect: true },
        { id: 2, text: "函数式编程", isCorrect: false },
        { id: 3, text: "面向对象", isCorrect: false },
        { id: 4, text: "声明式设计", isCorrect: true }
      ]
    },
    {
      id: 2,
      text: "JavaScript 中如何声明常量？",
      options: [
        { id: 1, text: "var", isCorrect: false },
        { id: 2, text: "let", isCorrect: false },
        { id: 3, text: "const", isCorrect: true },
        { id: 4, text: "define", isCorrect: false }
      ]
    }
  ]);
  
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    options: [
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false }
    ]
  });
  
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);

  useEffect(() => {
    // 检查用户权限
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) {
      router.push("/");
      return;
    }
    
    try {
      const user = JSON.parse(savedUser);
      if (user.role !== "speaker") {
        router.push("/");
        return;
      }
      setCurrentUser(user);
      
      // 后续可以从数据库获取课程信息和问题列表
    } catch (error) {
      localStorage.removeItem('currentUser');
      router.push("/");
    }
  }, [router, courseId]);

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...newQuestion.options];
    newOptions[index] = { ...newOptions[index], text: value };
    setNewQuestion({ ...newQuestion, options: newOptions });
  };
  
  const handleOptionCorrectChange = (index: number) => {
    const newOptions = [...newQuestion.options];
    newOptions[index] = { ...newOptions[index], isCorrect: !newOptions[index].isCorrect };
    setNewQuestion({ ...newQuestion, options: newOptions });
  };
  
  const handleSubmit = () => {
    // 验证问题填写是否完整
    if (!newQuestion.text.trim()) {
      setMessage("请输入问题内容");
      return;
    }
    
    const emptyOptions = newQuestion.options.some(option => !option.text.trim());
    if (emptyOptions) {
      setMessage("所有选项都必须填写");
      return;
    }
    
    const hasCorrectAnswer = newQuestion.options.some(option => option.isCorrect);
    if (!hasCorrectAnswer) {
      setMessage("请至少选择一个正确答案");
      return;
    }
    
    if (isEditing && editingQuestionId !== null) {
      // 编辑现有问题
      setQuestions(questions.map(q => 
        q.id === editingQuestionId ? 
        { 
          ...q, 
          text: newQuestion.text, 
          options: newQuestion.options.map((opt, idx) => ({ ...opt, id: idx + 1 })) 
        } : q
      ));
      setMessage("问题已更新");
    } else {
      // 添加新问题
      const newQuestionWithId = {
        id: Date.now(),
        text: newQuestion.text,
        options: newQuestion.options.map((option, index) => ({
          id: index + 1,
          text: option.text,
          isCorrect: option.isCorrect
        }))
      };
      
      setQuestions([...questions, newQuestionWithId]);
      setMessage("问题已添加");
    }
    
    // 重置表单
    setNewQuestion({
      text: "",
      options: [
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false }
      ]
    });
    setIsEditing(false);
    setEditingQuestionId(null);
    
    // 3秒后清除消息
    setTimeout(() => {
      setMessage("");
    }, 3000);
  };
  
  const handleEdit = (question: Question) => {
    setIsEditing(true);
    setEditingQuestionId(question.id);
    setNewQuestion({
      text: question.text,
      options: question.options.map(option => ({
        text: option.text,
        isCorrect: option.isCorrect
      }))
    });
  };
  
  const handleDelete = (id: number) => {
    setQuestions(questions.filter(q => q.id !== id));
    setMessage("问题已删除");
    
    // 如果正在编辑的问题被删除，重置编辑状态
    if (editingQuestionId === id) {
      setIsEditing(false);
      setEditingQuestionId(null);
      setNewQuestion({
        text: "",
        options: [
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false }
        ]
      });
    }
    
    // 3秒后清除消息
    setTimeout(() => {
      setMessage("");
    }, 3000);
  };
  
  const handleCancel = () => {
    setIsEditing(false);
    setEditingQuestionId(null);
    setNewQuestion({
      text: "",
      options: [
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false }
      ]
    });
  };

  if (!currentUser) {
    return <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800">加载中...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm">
        <div>
          <button 
            onClick={() => router.push('/speaker')}
            className="flex items-center text-gray-700 hover:text-gray-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            返回课程列表
          </button>
        </div>
        <h1 className="text-xl font-bold text-gray-800">{course.title} - 问卷管理</h1>
        <div className="w-24"></div>
      </header>
      
      {/* 主内容区 */}
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300"></div>
          <h2 className="text-lg font-medium mb-4">{isEditing ? "编辑问题" : "添加新问题"}</h2>
          
          <div className="space-y-4">
            {/* 问题输入 */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">问题内容</label>
              <input 
                type="text" 
                value={newQuestion.text}
                onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                placeholder="请输入问题内容"
              />
            </div>
            
            {/* 选项输入 */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">选项</label>
              <div className="space-y-2">
                {newQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      checked={option.isCorrect}
                      onChange={() => handleOptionCorrectChange(index)}
                      className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                    />
                    <input 
                      type="text"
                      value={option.text}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                      placeholder={`选项 ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">勾选表示正确答案</p>
            </div>
            
            {/* 提交按钮 */}
            <div className="flex space-x-2">
              <button 
                onClick={handleSubmit}
                className="px-4 py-2 bg-transparent text-gray-800 rounded-md hover:bg-gray-100 transition-colors border border-gray-300"
              >
                {isEditing ? "更新问题" : "添加问题"}
              </button>
              {isEditing && (
                <button 
                  onClick={handleCancel}
                  className="px-4 py-2 bg-transparent text-gray-600 rounded-md hover:bg-gray-100 transition-colors border border-gray-300"
                >
                  取消
                </button>
              )}
            </div>
          </div>
          
          {message && (
            <p className={`mt-3 text-sm ${message.includes("已") ? "text-green-600" : "text-red-600"}`}>
              {message}
            </p>
          )}
        </div>
        
        {/* 问题列表 */}
        <h2 className="text-xl font-medium mb-4">问题列表</h2>
        {questions.length > 0 ? (
          <div className="space-y-4">
            {questions.map(question => (
              <div 
                key={question.id} 
                className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300"></div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-medium">{question.text}</h3>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleEdit(question)}
                      className="text-sm px-2 py-1 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      编辑
                    </button>
                    <button 
                      onClick={() => handleDelete(question.id)}
                      className="text-sm px-2 py-1 text-red-600 hover:text-red-800 transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 mt-4">
                  {question.options.map(option => (
                    <div 
                      key={option.id}
                      className={`p-2 rounded-md border ${option.isCorrect ? "bg-gray-100 border-gray-400" : "bg-white border-gray-200"}`}
                    >
                      <div className="flex items-center">
                        <span className={`h-4 w-4 rounded-full mr-2 ${option.isCorrect ? "bg-gray-600" : "bg-gray-200"}`}></span>
                        <span>{option.text}</span>
                        {option.isCorrect && <span className="ml-2 text-xs text-gray-500">(正确答案)</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-600">尚未添加任何问题</p>
            <p className="text-gray-500 text-sm mt-2">使用上方表单添加您的第一个问题</p>
          </div>
        )}
      </div>
    </div>
  );
} 