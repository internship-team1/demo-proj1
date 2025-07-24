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
  questions?: Question[];
}

interface Question {
  id: number;
  content: string;
  options: Option[];
  correctOptionId?: number;
}

interface Option {
  id: number;
  content: string;
  isCorrect: boolean;
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  user: {
    username: string;
  };
}

interface Ranking {
  userId: number;
  username: string;
  correctCount: number;
  percentage: number;
  rank: number;
}

export default function CourseQuizPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId;
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{[questionId: number]: number}>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState<{correct: number, total: number, percentage: number} | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [canComment, setCanComment] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [courseInfo, setCourseInfo] = useState<{title: string, courseCode: string} | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quizEnded, setQuizEnded] = useState(false);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [userRanking, setUserRanking] = useState<Ranking | null>(null);

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
      
      // 加载课程的测验列表
      if (courseId) {
        fetchCourseInfo(courseId.toString());
        fetchQuizzes(courseId.toString());
      }
    } catch (error) {
      localStorage.removeItem('currentUser');
      router.push("/");
    }
  }, [courseId, router]);

  // 获取课程信息
  const fetchCourseInfo = async (courseId: string) => {
    try {
      const response = await fetch(`/api/course?id=${courseId}`);
      if (!response.ok) throw new Error("获取课程信息失败");
      
      const data = await response.json();
      setCourseInfo({
        title: data.title,
        courseCode: data.courseCode
      });
    } catch (error) {
      console.error("获取课程信息失败:", error);
    }
  };

  // 获取课程的测验列表
  const fetchQuizzes = async (courseId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/course/quiz?courseId=${courseId}`);
      if (!response.ok) throw new Error("获取测验失败");
      
      const data = await response.json();
      setQuizzes(data);
      
      // 检查是否有正在进行的测验
      const now = new Date();
      const activeQuizzes = data.filter((quiz: Quiz) => {
        if (!quiz.startTime || !quiz.endTime) return false;
        const startTime = new Date(quiz.startTime);
        const endTime = new Date(quiz.endTime);
        return quiz.isActive && startTime <= now && endTime >= now;
      });
      
      if (activeQuizzes.length > 0) {
        // 自动选择最新的活动测验
        const latestQuiz = activeQuizzes.sort((a: Quiz, b: Quiz) => 
          new Date(b.startTime!).getTime() - new Date(a.startTime!).getTime()
        )[0];
        
        // 检查用户是否已经提交了该测验的答案
        if (currentUser) {
          await checkUserAnswers(latestQuiz.id, currentUser.id);
        }
      }
    } catch (error) {
      console.error("获取测验失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 检查用户是否已提交答案
  const checkUserAnswers = async (quizId: number, userId: number) => {
    try {
      const response = await fetch(`/api/quiz/answers?quizId=${quizId}&userId=${userId}`);
      if (!response.ok) throw new Error("获取答案失败");
      
      const data = await response.json();
      
      if (data.success && data.hasSubmitted) {
        const quiz = quizzes.find(q => q.id === quizId);
        if (quiz) {
          setActiveQuiz(quiz);
          setSelectedAnswers(data.answers);
          setScore(data.score);
          setShowResults(true);
          setQuizCompleted(true);
          setHasSubmitted(true);
          
          // 检查测验是否已结束
          const now = new Date();
          const endTime = quiz.endTime ? new Date(quiz.endTime) : null;
          
          if (endTime) {
            if (now >= endTime) {
              setCanComment(true);
              setShowComments(true);
              fetchComments(quizId);
            } else {
              // 测验还未结束，设置倒计时
              const remainingMs = endTime.getTime() - now.getTime();
              const remainingSecs = Math.max(0, Math.floor(remainingMs / 1000));
              setTimeRemaining(remainingSecs);
            }
          }
        }
      }
    } catch (error) {
      console.error("获取用户答案失败:", error);
    }
  };

  // 倒计时效果
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          // 时间到，标记问卷结束
          setQuizEnded(true);
          setCanComment(true);
          if (quizCompleted) {
            setShowComments(true);
            if (activeQuiz) {
              fetchComments(activeQuiz.id);
              // 问卷结束时，获取成绩和排名
              if (currentUser) {
                fetchScoreAndRanking(activeQuiz.id, currentUser.id);
              }
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeRemaining, quizCompleted, activeQuiz, currentUser]);

  // 新增：获取分数和排名
  const fetchScoreAndRanking = async (quizId: number, userId: number) => {
    try {
      // 获取答案和分数
      const scoreResponse = await fetch(`/api/quiz/answers?quizId=${quizId}&userId=${userId}`);
      if (scoreResponse.ok) {
        const scoreData = await scoreResponse.json();
        if (scoreData.success) {
          setScore(scoreData.score);
        }
      }
      
      // 获取排名数据
      const rankingResponse = await fetch(`/api/quiz/ranking?quizId=${quizId}&userId=${userId}`);
      if (rankingResponse.ok) {
        const rankingData = await rankingResponse.json();
        setRankings(rankingData.ranking || []);
        setUserRanking(rankingData.userRanking);
      }
    } catch (error) {
      console.error("获取分数和排名失败:", error);
    }
  };

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 选择答案
  const handleSelectAnswer = (questionId: number, optionId: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
    setErrorMessage(null); // 清除错误消息
  };

  // 下一题
  const goToNextQuestion = () => {
    if (!activeQuiz || !activeQuiz.questions) return;
    
    // 检查用户是否已回答当前问题
    const currentQuestionId = activeQuiz.questions[currentQuestionIndex].id;
    if (selectedAnswers[currentQuestionId] === undefined) {
      setErrorMessage("请先回答当前问题。");
      return;
    }
    
    if (currentQuestionIndex < activeQuiz.questions.length - 1) {
      setErrorMessage(null); // 清除错误消息
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setShowResults(true);
    }
  };

  // 上一题
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // 提交测验
  const handleSubmitQuiz = async () => {
    if (!activeQuiz || !activeQuiz.questions || !currentUser) return;
    
    // 检查所有问题是否都已回答
    const unansweredQuestions = activeQuiz.questions.filter(question => 
      selectedAnswers[question.id] === undefined
    );
    
    if (unansweredQuestions.length > 0) {
      setErrorMessage(`还有 ${unansweredQuestions.length} 道题未回答，请先回答所有题目。`);
      return;
    }
    
    try {
      // 准备答案数据
      const answersData = Object.entries(selectedAnswers).map(([questionId, optionId]) => ({
        questionId: parseInt(questionId),
        optionId
      }));
      
      // 提交答案到服务器
      const response = await fetch("/api/quiz/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: activeQuiz.id,
          userId: currentUser.id,
          answers: answersData
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "提交答案失败");
      }
      
      // 设置状态为已完成但不显示分数
      setQuizCompleted(true);
      setHasSubmitted(true);
      
      // 检查测验是否已结束
      const now = new Date();
      const endTime = activeQuiz.endTime ? new Date(activeQuiz.endTime) : null;
      
      if (endTime && now >= endTime) {
        // 如果已经结束，则获取成绩和排名
        setQuizEnded(true);
        setCanComment(true);
        setShowComments(true);
        fetchComments(activeQuiz.id);
        fetchScoreAndRanking(activeQuiz.id, currentUser.id);
      } else {
        // 显示等待消息
        setShowResults(true);
      }
      
    } catch (error) {
      console.error("提交答案失败:", error);
      setQuizCompleted(true);
      setHasSubmitted(true);
    }
  };
  
  // 本地计算分数（作为备份）
  const calculateScoreLocally = () => {
    if (!activeQuiz || !activeQuiz.questions) return;
    
    let correctCount = 0;
    const totalQuestions = activeQuiz.questions.length;
    
    activeQuiz.questions.forEach(question => {
      const selectedOptionId = selectedAnswers[question.id];
      if (selectedOptionId !== undefined) {
        const correctOption = question.options.find(opt => opt.isCorrect);
        if (correctOption && selectedOptionId === correctOption.id) {
          correctCount++;
        }
      }
    });
    
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    
    setScore({
      correct: correctCount,
      total: totalQuestions,
      percentage
    });
  };

  // 获取测验评论
  const fetchComments = async (quizId: number) => {
    try {
      const response = await fetch(`/api/quiz/comments?quizId=${quizId}`);
      if (!response.ok) throw new Error("获取评论失败");
      
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error("获取评论失败:", error);
      // 如果API调用失败，使用空数组
      setComments([]);
    }
  };

  // 提交评论
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !activeQuiz || !currentUser || !canComment) return;
    
    try {
      const response = await fetch(`/api/quiz/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: activeQuiz.id,
          userId: currentUser.id,
          content: newComment
        })
      });
      
      if (!response.ok) throw new Error("提交评论失败");
      
      // API现在直接返回新创建的评论对象
      const newCommentData = await response.json();
      
      // 直接将新评论添加到评论列表的开头
      setComments(prev => [newCommentData, ...prev]);
      setNewComment(""); // 清空输入框
    } catch (error) {
      console.error("提交评论失败:", error);
    }
  };

  // 开始测验
  const handleStartQuiz = async (quiz: Quiz) => {
    // 先检查用户是否已经提交了该测验的答案
    if (currentUser) {
      try {
        const response = await fetch(`/api/quiz/answers?quizId=${quiz.id}&userId=${currentUser.id}`);
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.hasSubmitted) {
            // 用户已提交答案
            setActiveQuiz(quiz);
            setSelectedAnswers(data.answers);
            setQuizCompleted(true);
            setHasSubmitted(true);
            
            // 检查测验是否已结束
            const now = new Date();
            const endTime = quiz.endTime ? new Date(quiz.endTime) : null;
            
            if (endTime && now >= endTime) {
              // 如果已结束，获取成绩和排名
              setQuizEnded(true);
              setShowResults(true);
              setCanComment(true);
              setShowComments(true);
              fetchComments(quiz.id);
              fetchScoreAndRanking(quiz.id, currentUser.id);
            } else {
              // 如果未结束，仅显示等待消息
              setShowResults(true);
              const remainingMs = endTime!.getTime() - now.getTime();
              const remainingSecs = Math.max(0, Math.floor(remainingMs / 1000));
              setTimeRemaining(remainingSecs);
            }
            return;
          }
        }
      } catch (error) {
        console.error("检查用户答案失败:", error);
      }
    }
    
    // 用户未提交答案，开始测验
    setActiveQuiz(quiz);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
    setQuizCompleted(false);
    setHasSubmitted(false);
    setQuizEnded(false);
    
    // 计算剩余时间
    if (quiz.endTime) {
      const now = new Date();
      const endTime = new Date(quiz.endTime);
      const remainingMs = endTime.getTime() - now.getTime();
      const remainingSecs = Math.max(0, Math.floor(remainingMs / 1000));
      setTimeRemaining(remainingSecs);
    } else {
      // 默认2分钟
      setTimeRemaining(120);
    }
  };

  // 查看结果
  const handleViewResults = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setShowResults(true);
    setQuizCompleted(true);
    setHasSubmitted(true);
    setQuizEnded(true);
    setCanComment(true);
    setShowComments(true);
    fetchComments(quiz.id);
    
    // 如果用户已提交答案，获取用户的答案和排名
    if (currentUser) {
      fetchScoreAndRanking(quiz.id, currentUser.id);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800">加载中...</div>;
  }

  if (!currentUser) {
    return <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800">加载中...</div>;
  }

  // 显示活动测验
  if (activeQuiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 p-8">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-8">
            <button 
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              onClick={() => {
                if (quizCompleted || window.confirm("确定要退出测验吗？您的答案将不会被保存。")) {
                  setActiveQuiz(null);
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              返回测验列表
            </button>
            
            {timeRemaining !== null && timeRemaining > 0 && (
              <div className={`px-4 py-2 rounded-full ${timeRemaining < 30 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                剩余时间: {formatTime(timeRemaining)}
              </div>
            )}
          </div>
          
          <h1 className="text-3xl font-bold mb-2 text-gray-800">{activeQuiz.title}</h1>
          
          {showResults || quizCompleted ? (
            <div className="quiz-results">
              {quizEnded ? (
                <>
                  {/* 合并分数和排名信息，只显示必要信息 */}
                  <div className="text-center py-6 mb-4 bg-gray-50 rounded-lg relative">
                    {score && userRanking && (
                      <>
                        <div className="absolute top-2 left-4 text-blue-600 text-sm font-medium">
                          正确率
                        </div>
                        <h3 className="text-5xl font-bold mb-3 text-blue-600">{score.percentage}%</h3>
                        <p className="text-gray-700 text-lg font-medium">
                          第 {userRanking.rank} 名
                          {rankings.length > 1 && <span className="text-sm text-gray-500 ml-2">(共 {rankings.length} 人)</span>}
                        </p>
                      </>
                    )}
                  </div>
                  
                  {/* 移除排名显示独立区块 */}
                  
                  {/* 移除排行榜 */}
                  
                  {/* 问题回顾 */}
                  {activeQuiz.questions && activeQuiz.questions.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-xl font-semibold mb-4">测验回顾</h3>
                      
                      <div className="space-y-6">
                        {activeQuiz.questions.map((question, idx) => {
                          const selectedOptionId = selectedAnswers[question.id];
                          const correctOption = question.options.find(opt => opt.isCorrect);
                          const isCorrect = selectedOptionId !== undefined && correctOption && selectedOptionId === correctOption.id;
                          
                          return (
                            <div key={question.id} className="pb-4">
                              <h4 className="font-medium mb-3">{question.content}</h4>
                              <div className="space-y-2">
                                {question.options.map(option => (
                                  <div 
                                    key={option.id} 
                                    className={`p-3 rounded-md border ${
                                      option.isCorrect ? 'border-green-500 bg-green-50' : 
                                      selectedOptionId === option.id ? 'border-red-500 bg-red-50' : 
                                      'border-gray-200'
                                    }`}
                                  >
                                    <div className="flex items-center">
                                      <span className={`inline-block w-6 h-6 rounded-full mr-2 text-center flex items-center justify-center ${
                                        option.isCorrect ? 'bg-green-500 text-white' : 
                                        selectedOptionId === option.id ? 'bg-red-500 text-white' : 
                                        'bg-gray-100 text-gray-700'
                                      }`}>
                                        {String.fromCharCode(65 + idx % 26)}
                                      </span>
                                      <span className="flex-grow">{option.content}</span>
                                      {option.isCorrect && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                      {selectedOptionId === option.id && !option.isCorrect && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // 问卷未结束前显示的消息
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-xl font-medium mb-2 text-gray-700">答案已提交</h3>
                  <p className="text-gray-500">问卷结束后将显示您的分数和排名</p>
                  {timeRemaining !== null && timeRemaining > 0 && (
                    <p className="mt-4 text-blue-600 font-medium">
                      剩余时间: {formatTime(timeRemaining)}
                    </p>
                  )}
                </div>
              )}
              
              {/* 留言区 */}
              {showComments && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">留言讨论区</h3>
                    {!canComment && (
                      <p className="text-sm text-amber-600">
                        测验未结束，留言功能将在倒计时结束后开放
                      </p>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <textarea 
                      className={`w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 ${!canComment ? 'bg-gray-100' : ''}`}
                      placeholder={canComment ? "分享你的想法..." : "测验未结束，暂时无法留言"}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      disabled={!canComment}
                      rows={3}
                    ></textarea>
                    <button 
                      className={`mt-2 px-4 py-2 rounded-md transition-colors ${
                        canComment 
                        ? 'bg-gray-700 text-white hover:bg-gray-800' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      onClick={handleSubmitComment}
                      disabled={!canComment}
                    >
                      发送留言
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {comments.length > 0 ? (
                      comments.map(comment => (
                        <div key={comment.id} className="p-4 bg-gray-50 rounded-md border border-gray-200">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{comment.user.username}</span>
                            <span className="text-sm text-gray-500">{new Date(comment.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-gray-700">{comment.content}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500">暂无留言</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="quiz-question">
              {activeQuiz.questions && activeQuiz.questions.length > 0 && (
                <>
                  <p className="text-sm text-gray-500 mb-6">问题 {currentQuestionIndex + 1} / {activeQuiz.questions.length}</p>
                  
                  <h3 className="text-xl font-medium mb-6">{activeQuiz.questions[currentQuestionIndex].content}</h3>
                  
                  <div className="space-y-3">
                    {activeQuiz.questions[currentQuestionIndex].options.map((option, idx) => (
                      <div 
                        key={option.id} 
                        className={`p-4 rounded-md border transition-all cursor-pointer ${
                          selectedAnswers[activeQuiz.questions![currentQuestionIndex].id] === option.id
                            ? 'border-gray-800 bg-gray-100' 
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                        onClick={() => handleSelectAnswer(activeQuiz.questions![currentQuestionIndex].id, option.id)}
                      >
                        <div className="flex items-center">
                          <span className={`inline-block w-8 h-8 rounded-full mr-3 text-center flex items-center justify-center ${
                            selectedAnswers[activeQuiz.questions![currentQuestionIndex].id] === option.id
                              ? 'bg-gray-800 text-white' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {String.fromCharCode(65 + idx % 26)}
                          </span>
                          <span className="flex-grow">{option.content}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* 错误消息显示 */}
                  {errorMessage && (
                    <div className="mt-4 p-2 bg-red-50 border border-red-100 rounded-md text-red-600 text-sm">
                      {errorMessage}
                    </div>
                  )}
                  
                  {/* 导航区域 */}
                  <div className="mt-8 flex justify-between items-center">
                    <button 
                      onClick={goToPreviousQuestion}
                      disabled={currentQuestionIndex === 0}
                      className={`flex items-center py-2 px-4 rounded-md ${
                        currentQuestionIndex === 0 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      上一题
                    </button>
                    
                    {currentQuestionIndex === activeQuiz.questions.length - 1 ? (
                      <button 
                        onClick={handleSubmitQuiz}
                        className="flex items-center py-2 px-6 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors"
                      >
                        提交答案
                      </button>
                    ) : (
                      <button 
                        onClick={goToNextQuestion}
                        className="flex items-center py-2 px-4 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors"
                      >
                        下一题
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 显示问卷列表
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
        <p className="text-gray-500 mb-8">课程码: {courseInfo?.courseCode || "加载中..."}</p>
        
        {quizzes.length > 0 ? (
          <div className="space-y-6">
            {quizzes
              .filter(quiz => {
                // 只显示正在进行中或已结束的测验
                const now = new Date();
                const startTime = quiz.startTime ? new Date(quiz.startTime) : null;
                const endTime = quiz.endTime ? new Date(quiz.endTime) : null;
                return quiz.isActive && startTime && (
                  (startTime <= now && endTime && endTime >= now) || // 进行中
                  (endTime && now > endTime) // 已结束
                );
              })
              .map(quiz => {
                // 检查测验是否正在进行中
                const now = new Date();
                const startTime = quiz.startTime ? new Date(quiz.startTime) : null;
                const endTime = quiz.endTime ? new Date(quiz.endTime) : null;
                const isActive = quiz.isActive && startTime && endTime && startTime <= now && endTime >= now;
                const isCompleted = quiz.isActive && endTime && now > endTime;
                
                return (
                  <div key={quiz.id} className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300"></div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-medium text-gray-800">{quiz.title}</h3>
                        {quiz.description && (
                          <p className="text-gray-600 mt-1">{quiz.description}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        isActive ? "bg-green-100 text-green-800 border border-green-200" : 
                        "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}>
                        {isActive ? "进行中" : "已结束"}
                      </span>
                    </div>
                    
                    {quiz.startTime && quiz.endTime && (
                      <div className="flex space-x-4 text-sm text-gray-500 mb-4">
                        <span>开始: {new Date(quiz.startTime).toLocaleString()}</span>
                        <span>结束: {new Date(quiz.endTime).toLocaleString()}</span>
                      </div>
                    )}
                    
                    <div className="flex space-x-4">
                      {isActive && (
                        <button 
                          className="py-2 px-4 bg-transparent hover:bg-gray-100 text-gray-800 rounded-md transition-colors border border-gray-300"
                          onClick={() => handleStartQuiz(quiz)}
                        >
                          开始答题
                        </button>
                      )}
                      {isCompleted && (
                        <button 
                          className="py-2 px-4 bg-transparent hover:bg-gray-100 text-gray-600 rounded-md transition-colors border border-gray-300"
                          onClick={() => handleViewResults(quiz)}
                        >
                          查看结果
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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