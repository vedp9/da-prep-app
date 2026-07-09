import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Database, 
  Code, 
  LineChart, 
  FileSpreadsheet, 
  BarChart3, 
  PieChart, 
  Award, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  ChevronLeft, 
  RefreshCw, 
  Flame, 
  HelpCircle, 
  Trophy, 
  Sparkles,
  BookOpen,
  Info
} from 'lucide-react';
import questionsData from './questions.json';
import { playTap, playCorrect, playIncorrect, playSuccess } from './utils/audio';
import { getDatabase, executeQuery } from './utils/db';

// Confetti Component for Celebrations (lightweight custom HTML5 Canvas)
function Confetti() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resizeCanvas();

    const colors = ['#22d3ee', '#3b82f6', '#10b981', '#fb923c', '#ec4899', '#a855f7'];
    const particles = Array.from({ length: 80 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: Math.random() * 3 + 2,
      angle: Math.random() * 2 * Math.PI,
      spinSpeed: Math.random() * 0.2 - 0.1,
      spin: 0
    }));

    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;

      particles.forEach(p => {
        p.y += p.speed;
        p.x += Math.sin(p.angle) * 0.4;
        p.angle += 0.01;
        p.spin += p.spinSpeed;

        if (p.y < canvas.height) {
          active = true;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();

        if (p.y > canvas.height) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
      });

      animationFrameId = requestAnimationFrame(update);
    };

    update();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-50 w-full h-full" />;
}

export default function App() {
  // --- Navigation & Core Progress States ---
  const [screen, setScreen] = useState('dashboard'); // 'dashboard' | 'quiz' | 'summary'
  const [selectedTopic, setSelectedTopic] = useState(null);
  
  // Progress saved in LocalStorage
  const [totalXp, setTotalXp] = useState(() => {
    const saved = localStorage.getItem('da_prep_total_xp');
    return saved ? parseInt(saved, 10) : 0;
  });
  
  const [completedQuestions, setCompletedQuestions] = useState(() => {
    const saved = localStorage.getItem('da_prep_completed_questions');
    return saved ? JSON.parse(saved) : [];
  });

  const [streak, setStreak] = useState(() => {
    const saved = localStorage.getItem('da_prep_streak');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [lastActivityDate, setLastActivityDate] = useState(() => {
    return localStorage.getItem('da_prep_last_activity_date') || '';
  });

  // --- SQL Wasm Engine States ---
  const [sqliteDb, setSqliteDb] = useState(null);
  const [dbLoading, setDbLoading] = useState(false);

  // --- Active Quiz Session States ---
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null); // For MCQ
  const [dropZone, setDropZone] = useState([]); // For Interactive Coding: array of { id, text }
  const [wordBank, setWordBank] = useState([]); // For Interactive Coding: array of { id, text }
  const [tappedIds, setTappedIds] = useState([]); // Ordered array of wordBank item IDs in dropZone
  
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // Stats for the active quiz session
  const [sessionXpEarned, setSessionXpEarned] = useState(0);
  const [sessionCorrectCount, setSessionCorrectCount] = useState(0);

  // --- UI Interactive States ---
  const [showSchemaHelper, setShowSchemaHelper] = useState(false);
  const [sqlResult, setSqlResult] = useState(null); // { columns, rows, error }

  // Sync core progress to localStorage
  useEffect(() => {
    localStorage.setItem('da_prep_total_xp', totalXp.toString());
  }, [totalXp]);

  useEffect(() => {
    localStorage.setItem('da_prep_completed_questions', JSON.stringify(completedQuestions));
  }, [completedQuestions]);

  useEffect(() => {
    localStorage.setItem('da_prep_streak', streak.toString());
  }, [streak]);

  // Load SQL.js WebAssembly on startup
  useEffect(() => {
    async function loadSqlEngine() {
      setDbLoading(true);
      try {
        const db = await getDatabase();
        setDb(sqliteDb || db);
      } catch (err) {
        console.error("Failed loading SQL.js WASM engine", err);
      } finally {
        setDbLoading(false);
      }
    }
    loadSqlEngine();
  }, []);

  // --- Topic Configurations ---
  const topics = useMemo(() => [
    { 
      name: 'SQL', 
      icon: Database, 
      color: 'cyan', 
      gradient: 'from-cyan-500 to-blue-600',
      shadow: 'shadow-cyan-950/50',
      border: 'border-cyan-500/20',
      description: 'Queries, joins, window functions & aggregations' 
    },
    { 
      name: 'Python', 
      icon: Code, 
      color: 'emerald', 
      gradient: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-950/50',
      border: 'border-emerald-500/20',
      description: 'Pandas, NumPy, data clean & data structures' 
    },
    { 
      name: 'Stats', 
      icon: LineChart, 
      color: 'purple', 
      gradient: 'from-purple-500 to-indigo-600',
      shadow: 'shadow-purple-950/50',
      border: 'border-purple-500/20',
      description: 'A/B testing, probabilities & hypothesis tests' 
    },
    { 
      name: 'Excel', 
      icon: FileSpreadsheet, 
      color: 'amber', 
      gradient: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-950/50',
      border: 'border-amber-500/20',
      description: 'VLOOKUP, Pivot Tables, logical formulas' 
    },
    { 
      name: 'PowerBI', 
      icon: BarChart3, 
      color: 'rose', 
      gradient: 'from-rose-500 to-pink-600',
      shadow: 'shadow-rose-950/50',
      border: 'border-rose-500/20',
      description: 'DAX formulas, modeling & visuals filters' 
    },
    { 
      name: 'Tableau', 
      icon: PieChart, 
      color: 'sky', 
      gradient: 'from-sky-500 to-indigo-500',
      shadow: 'shadow-sky-950/50',
      border: 'border-sky-500/20',
      description: 'LOD expressions, mapping & dashboard parameters' 
    }
  ], []);

  // Compute question stats per topic
  const topicStats = useMemo(() => {
    const stats = {};
    topics.forEach(t => {
      const topicQuestions = questionsData.filter(q => q.topic.toLowerCase() === t.name.toLowerCase());
      const total = topicQuestions.length;
      const completed = topicQuestions.filter(q => completedQuestions.includes(q.id)).length;
      
      // Calculate difficulties
      const difficulties = { easy: 0, medium: 0, hard: 0 };
      topicQuestions.forEach(q => {
        if (q.difficulty && difficulties[q.difficulty] !== undefined) {
          difficulties[q.difficulty]++;
        }
      });
      
      const compDifficulties = { easy: 0, medium: 0, hard: 0 };
      topicQuestions.filter(q => completedQuestions.includes(q.id)).forEach(q => {
        if (q.difficulty && compDifficulties[q.difficulty] !== undefined) {
          compDifficulties[q.difficulty]++;
        }
      });

      stats[t.name] = {
        total,
        completed,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0,
        difficulties,
        compDifficulties
      };
    });
    return stats;
  }, [completedQuestions, topics]);

  // Compute current level based on XP
  const levelDetails = useMemo(() => {
    const xpPerLevel = 100;
    const currentLvl = Math.floor(totalXp / xpPerLevel) + 1;
    const xpRemaining = totalXp % xpPerLevel;
    const progressPercent = Math.round((xpRemaining / xpPerLevel) * 100);
    
    // Title rank badges
    let title = "Data Novice";
    if (totalXp >= 800) title = "Grand Analytics Master";
    else if (totalXp >= 500) title = "Lead Data Architect";
    else if (totalXp >= 300) title = "Senior Data Analyst";
    else if (totalXp >= 150) title = "Analytics Specialist";
    else if (totalXp >= 50) title = "Junior Data Analyst";

    return {
      level: currentLvl,
      xpRemaining,
      xpPerLevel,
      progressPercent,
      title
    };
  }, [totalXp]);

  const activeQuestion = sessionQuestions[currentQuestionIndex];

  // SQL Live execution triggered on coding word zone changes
  useEffect(() => {
    if (!activeQuestion || activeQuestion.type !== 'interactive_coding' || activeQuestion.topic !== 'SQL') {
      setSqlResult(null);
      return;
    }

    const currentQuery = tappedIds.map(id => {
      const item = wordBank.find(w => w.id === id);
      return item ? item.text : '';
    }).join(' \n'); // Join clauses with newlines

    if (!currentQuery.trim()) {
      setSqlResult(null);
      return;
    }

    // Lazy load DB if not loaded yet
    async function runLivePreview() {
      try {
        const db = sqliteDb || await getDatabase();
        if (!sqliteDb) setSqliteDb(db);
        const result = executeQuery(db, currentQuery);
        setSqlResult(result);
      } catch (err) {
        setSqlResult({ error: err.message });
      }
    }
    
    // Small timeout to prevent excessive runs
    const timer = setTimeout(() => {
      runLivePreview();
    }, 120);

    return () => clearTimeout(timer);

  }, [tappedIds, wordBank, activeQuestion, sqliteDb]);

  // --- Handlers ---
  
  const handleStartQuiz = (topicName) => {
    playTap();
    setSelectedTopic(topicName);
    
    // Find questions for this topic
    const allTopicQuestions = questionsData.filter(
      q => q.topic.toLowerCase() === topicName.toLowerCase()
    );
    
    // Filter out already completed ones
    let targetQuestions = allTopicQuestions.filter(q => !completedQuestions.includes(q.id));
    
    // If all completed, practice completed ones (infinite repeat)
    if (targetQuestions.length === 0) {
      targetQuestions = [...allTopicQuestions];
    }

    // Shuffle questions and select top 5
    const shuffled = [...targetQuestions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5);

    setSessionQuestions(selected);
    setCurrentQuestionIndex(0);
    setSessionXpEarned(0);
    setSessionCorrectCount(0);
    
    setupQuestion(selected[0]);
    setScreen('quiz');
  };

  const setupQuestion = (question) => {
    setSelectedOption(null);
    setIsAnswerChecked(false);
    setIsCorrect(false);
    setTappedIds([]);
    setSqlResult(null);
    
    if (question.type === 'interactive_coding') {
      // Map options to unique items and shuffle them
      const items = question.options.map((opt, idx) => ({
        id: `word_${idx}_${Date.now()}`,
        text: opt
      }));
      setWordBank([...items].sort(() => 0.5 - Math.random()));
    }
  };

  const handleTapWordBank = (id) => {
    playTap();
    setTappedIds(prev => [...prev, id]);
  };

  const handleTapDropZone = (id) => {
    playTap();
    setTappedIds(prev => prev.filter(item => item !== id));
  };

  const handleCheckAnswer = () => {
    if (isAnswerChecked) return;

    let correct = false;

    if (activeQuestion.type === 'mcq') {
      correct = selectedOption === activeQuestion.correct_answer;
    } else if (activeQuestion.type === 'interactive_coding') {
      // Get the order of selected texts
      const userAnswers = tappedIds.map(id => {
        const item = wordBank.find(w => w.id === id);
        return item ? item.text : '';
      });
      
      const correctAnswers = activeQuestion.correct_answer;
      
      // Compare arrays element by element
      if (userAnswers.length === correctAnswers.length) {
        correct = userAnswers.every((val, idx) => val === correctAnswers[idx]);
      }
    }

    setIsCorrect(correct);
    setIsAnswerChecked(true);

    if (correct) {
      playCorrect();
      setSessionCorrectCount(c => c + 1);
      setSessionXpEarned(xp => xp + (activeQuestion.xp_reward || 10));
      
      // Save completed question
      if (!completedQuestions.includes(activeQuestion.id)) {
        setCompletedQuestions(prev => [...prev, activeQuestion.id]);
      }
    } else {
      playIncorrect();
    }
  };

  const handleContinue = () => {
    playTap();
    
    if (currentQuestionIndex + 1 < sessionQuestions.length) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      setupQuestion(sessionQuestions[nextIdx]);
    } else {
      // Finish Quiz
      playSuccess();
      
      // Calculate Streak
      const today = new Date().toDateString();
      if (lastActivityDate !== today) {
        setStreak(s => s + 1);
        setLastActivityDate(today);
        localStorage.setItem('da_prep_last_activity_date', today);
      }
      
      setTotalXp(xp => xp + sessionXpEarned);
      setScreen('summary');
    }
  };

  const handleResetProgress = () => {
    if (window.confirm("Are you sure you want to reset all your learning history, XP, and streak?")) {
      playTap();
      setTotalXp(0);
      setCompletedQuestions([]);
      setStreak(0);
      setLastActivityDate('');
      localStorage.removeItem('da_prep_total_xp');
      localStorage.removeItem('da_prep_completed_questions');
      localStorage.removeItem('da_prep_streak');
      localStorage.removeItem('da_prep_last_activity_date');
    }
  };

  // Color theme helpers
  const getThemeColors = (topic) => {
    switch (topic?.toLowerCase()) {
      case 'sql':
        return {
          bg: 'bg-cyan-500',
          text: 'text-cyan-400',
          border: 'border-cyan-500/30',
          accent: 'cyan',
          darkBg: 'bg-cyan-950/20',
          buttonActive: 'border-cyan-500 bg-cyan-950/40 text-cyan-200'
        };
      case 'python':
        return {
          bg: 'bg-emerald-500',
          text: 'text-emerald-400',
          border: 'border-emerald-500/30',
          accent: 'emerald',
          darkBg: 'bg-emerald-950/20',
          buttonActive: 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
        };
      case 'stats':
        return {
          bg: 'bg-purple-500',
          text: 'text-purple-400',
          border: 'border-purple-500/30',
          accent: 'purple',
          darkBg: 'bg-purple-950/20',
          buttonActive: 'border-purple-500 bg-purple-950/40 text-purple-200'
        };
      case 'excel':
        return {
          bg: 'bg-amber-500',
          text: 'text-amber-400',
          border: 'border-amber-500/30',
          accent: 'amber',
          darkBg: 'bg-amber-950/20',
          buttonActive: 'border-amber-500 bg-amber-950/40 text-amber-200'
        };
      case 'powerbi':
        return {
          bg: 'bg-rose-500',
          text: 'text-rose-400',
          border: 'border-rose-500/30',
          accent: 'rose',
          darkBg: 'bg-rose-950/20',
          buttonActive: 'border-rose-500 bg-rose-950/40 text-rose-200'
        };
      case 'tableau':
        return {
          bg: 'bg-sky-500',
          text: 'text-sky-400',
          border: 'border-sky-500/30',
          accent: 'sky',
          darkBg: 'bg-sky-950/20',
          buttonActive: 'border-sky-500 bg-sky-950/40 text-sky-200'
        };
      default:
        return {
          bg: 'bg-blue-500',
          text: 'text-blue-400',
          border: 'border-blue-500/30',
          accent: 'blue',
          darkBg: 'bg-blue-950/20',
          buttonActive: 'border-blue-500 bg-blue-950/40 text-blue-200'
        };
    }
  };

  const currentTheme = getThemeColors(selectedTopic);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-start tap-highlight-none">
      
      {/* Centered Mobile Frame */}
      <div className="w-full max-w-md bg-[#0a0f1d] border-x border-slate-900 min-h-screen shadow-2xl flex flex-col relative overflow-x-hidden no-scrollbar pb-6">
        
        {/* --- SCREEN: DASHBOARD --- */}
        {screen === 'dashboard' && (
          <div className="flex-1 flex flex-col p-5 animate-fade-in">
            
            {/* Header / Stats Panel */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-900/30">
                  {levelDetails.level}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-300">Level {levelDetails.level}</h3>
                  <p className="text-xs text-slate-500 font-medium">{levelDetails.title}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Streak Counter */}
                <div className="flex items-center gap-1.5 bg-orange-950/30 border border-orange-500/20 px-3 py-1.5 rounded-full text-orange-400 font-bold text-sm shadow-inner">
                  <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
                  <span>{streak} d</span>
                </div>
                
                {/* Total XP Display */}
                <div className="flex items-center gap-1.5 bg-amber-950/30 border border-amber-500/20 px-3 py-1.5 rounded-full text-amber-400 font-bold text-sm shadow-inner">
                  <Award className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>{totalXp} XP</span>
                </div>
              </div>
            </div>

            {/* Level Progress Bar */}
            <div className="glass-card rounded-2xl p-4 mb-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -z-10"></div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-2">
                <span>Rank Progression</span>
                <span>{levelDetails.xpRemaining} / {levelDetails.xpPerLevel} XP</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                <div 
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${levelDetails.progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Topics Grid */}
            <div className="mb-6 flex-1">
              <h2 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                Select Practice Topic
              </h2>
              
              <div className="grid grid-cols-1 gap-4">
                {topics.map((topic) => {
                  const Icon = topic.icon;
                  const stats = topicStats[topic.name] || { completed: 0, total: 0, percent: 0 };
                  
                  return (
                    <button
                      key={topic.name}
                      onClick={() => handleStartQuiz(topic.name)}
                      className={`relative flex items-center text-left p-4 rounded-2xl border bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 transition-all duration-300 group overflow-hidden ${topic.shadow} shadow-lg`}
                    >
                      {/* Gradient border indicator */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${topic.gradient}`}></div>
                      
                      {/* Accent glow on hover */}
                      <div className={`absolute -right-4 -bottom-4 w-28 h-28 bg-gradient-to-tr ${topic.gradient} opacity-5 blur-2xl group-hover:opacity-10 transition-opacity`}></div>
                      
                      {/* Topic Icon */}
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${topic.gradient} flex items-center justify-center text-white mr-4 shadow-md`}>
                        <Icon className="w-6 h-6 stroke-[2]" />
                      </div>
                      
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex justify-between items-center mb-0.5">
                          <h3 className="font-bold text-slate-100 text-sm">{topic.name}</h3>
                          <span className="text-xs font-semibold text-slate-400">{stats.completed}/{stats.total} Qs</span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mb-2">{topic.description}</p>
                        
                        {/* Miniature Progress bar */}
                        <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden p-0.5 border border-slate-700/20">
                          <div 
                            className={`bg-gradient-to-r ${topic.gradient} h-full rounded-full`}
                            style={{ width: `${stats.percent}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="text-slate-500 group-hover:text-slate-300 transition-colors pl-2">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DB Load & Settings Gear */}
            <div className="flex justify-between items-center mt-auto border-t border-slate-900 pt-5">
              <span className="text-[10px] text-slate-500 font-medium tracking-wide flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${dbLoading ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`}></span>
                SQLite WebAssembly: {dbLoading ? 'Initializing...' : 'Ready'}
              </span>
              
              <button
                onClick={handleResetProgress}
                className="text-xs text-rose-500/80 hover:text-rose-400 transition-colors flex items-center gap-1 font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Data
              </button>
            </div>

          </div>
        )}

        {/* --- SCREEN: QUIZ --- */}
        {screen === 'quiz' && activeQuestion && (
          <div className="flex-1 flex flex-col justify-between animate-fade-in relative min-h-screen">
            
            {/* Top Navigation Panel */}
            <div className="px-4 pt-5 pb-3 bg-[#0a0f1d] border-b border-slate-900 sticky top-0 z-30">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => { playTap(); setScreen('dashboard'); }}
                  className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-center text-slate-400 hover:text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <span className="text-xs font-bold text-slate-400 tracking-wider">
                  {selectedTopic?.toUpperCase()} STUDY
                </span>

                <div className="text-xs font-bold text-amber-400 flex items-center gap-1 bg-amber-950/20 px-2.5 py-1 rounded-full border border-amber-500/20">
                  <Award className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>+{sessionXpEarned} XP</span>
                </div>
              </div>

              {/* Progress Slider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-850 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div 
                    className="bg-gradient-to-r from-emerald-400 to-green-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuestionIndex) / sessionQuestions.length) * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs font-bold text-slate-400 whitespace-nowrap">
                  {currentQuestionIndex + 1} of {sessionQuestions.length}
                </span>
              </div>
            </div>

            {/* Quiz Body */}
            <div className="flex-1 p-5 overflow-y-auto pb-40">
              
              {/* Question Metadata Tags */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  activeQuestion.difficulty === 'easy' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                  activeQuestion.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {activeQuestion.difficulty}
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-semibold">
                  {activeQuestion.subtopic}
                </span>
                <span className="ml-auto text-[10px] text-slate-500 font-bold">
                  +{activeQuestion.xp_reward} XP
                </span>
              </div>

              {/* Question Statement */}
              <h1 className="text-lg font-bold text-slate-100 leading-snug mb-5">
                {activeQuestion.question}
              </h1>

              {/* SQL Context Schema Helper */}
              {activeQuestion.context && (
                <div className="mb-5 glass rounded-2xl overflow-hidden border border-slate-800">
                  <button
                    onClick={() => { playTap(); setShowSchemaHelper(!showSchemaHelper); }}
                    className="w-full flex items-center justify-between p-3.5 text-slate-300 font-bold text-xs bg-slate-900/60"
                  >
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-cyan-400" />
                      <span>SQL Schema: {activeQuestion.context.tableName}</span>
                    </div>
                    <span className="text-[10px] text-cyan-400">{showSchemaHelper ? 'Hide Table' : 'Show Table'}</span>
                  </button>
                  
                  {showSchemaHelper && (
                    <div className="p-3.5 bg-slate-950/80 border-t border-slate-900 text-xs font-mono select-text">
                      <p className="text-slate-400 mb-1.5">
                        <strong className="text-slate-200">Table(s):</strong> {activeQuestion.context.tableName}
                      </p>
                      <div>
                        <strong className="text-slate-200 block mb-1">Columns:</strong>
                        <div className="flex flex-wrap gap-1.5">
                          {activeQuestion.context.columns.map((col, cIdx) => (
                            <span key={cIdx} className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-300 text-[11px]">
                              {col}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* --- TYPE 1: MCQ Options --- */}
              {activeQuestion.type === 'mcq' && (
                <div className="grid grid-cols-1 gap-3">
                  {activeQuestion.options.map((option, idx) => {
                    const letters = ['A', 'B', 'C', 'D'];
                    const isSelected = selectedOption === option;
                    const isCorrectOption = option === activeQuestion.correct_answer;
                    
                    let btnStyle = 'border-slate-800 bg-slate-900/40 text-slate-200';
                    let bubbleStyle = 'bg-slate-800 text-slate-400 border-slate-700';

                    if (!isAnswerChecked) {
                      if (isSelected) {
                        btnStyle = `${currentTheme.border} ${currentTheme.darkBg} text-slate-100 ring-2 ring-${currentTheme.accent}-500/40`;
                        bubbleStyle = `${currentTheme.bg} text-white border-transparent`;
                      }
                    } else {
                      // Checked styles
                      if (isSelected) {
                        if (isCorrect) {
                          btnStyle = 'border-emerald-500 bg-emerald-950/20 text-emerald-300 ring-2 ring-emerald-500/20';
                          bubbleStyle = 'bg-emerald-500 text-white border-transparent';
                        } else {
                          btnStyle = 'border-rose-500 bg-rose-950/20 text-rose-300 ring-2 ring-rose-500/20';
                          bubbleStyle = 'bg-rose-500 text-white border-transparent';
                        }
                      } else if (isCorrectOption) {
                        // Highlight correct answer if user got it wrong
                        btnStyle = 'border-emerald-500/60 bg-emerald-950/10 text-emerald-400';
                        bubbleStyle = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={isAnswerChecked}
                        onClick={() => { playTap(); setSelectedOption(option); }}
                        className={`flex items-center p-3.5 rounded-xl border text-left text-sm font-medium transition-all duration-150 ${btnStyle}`}
                      >
                        <span className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold mr-3.5 shrink-0 transition-colors ${bubbleStyle}`}>
                          {letters[idx]}
                        </span>
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* --- TYPE 2: Interactive Coding (Duolingo Style) --- */}
              {activeQuestion.type === 'interactive_coding' && (
                <div className="flex flex-col gap-6">
                  
                  {/* Drop Zone */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                      Your Code Solution
                    </h3>
                    <div className="min-h-[140px] w-full rounded-2xl border-2 border-dashed border-slate-800 bg-slate-950/40 p-3.5 flex flex-wrap gap-2.5 items-start content-start relative">
                      
                      {tappedIds.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs font-medium px-4 text-center pointer-events-none select-none">
                          Tap code blocks from the bank below to compile your solution
                        </div>
                      )}
                      
                      {tappedIds.map((id) => {
                        const item = wordBank.find(w => w.id === id);
                        if (!item) return null;
                        return (
                          <button
                            key={id}
                            disabled={isAnswerChecked}
                            onClick={() => handleTapDropZone(id)}
                            className="bg-slate-850 hover:bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 shadow-md hover:border-sky-500/50 hover:shadow-sky-950/20 active:scale-95 transition-all animate-scale-in text-left select-none"
                          >
                            {item.text}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* SQLite execution sandbox preview */}
                  {activeQuestion.topic === 'SQL' && tappedIds.length > 0 && (
                    <div className="rounded-2xl border border-slate-900 bg-slate-950/80 p-3.5 shadow-inner">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          WebAssembly SQLite Live Output
                        </h4>
                      </div>

                      {sqlResult === null && (
                        <div className="text-[10px] text-slate-600 font-mono">Running query...</div>
                      )}

                      {sqlResult && sqlResult.error && (
                        <div className="text-[10px] text-slate-500 font-mono bg-slate-900/30 p-2 rounded border border-slate-900/60 leading-relaxed max-h-20 overflow-y-auto no-scrollbar">
                          {sqlResult.error}
                        </div>
                      )}

                      {sqlResult && !sqlResult.error && (
                        <div className="overflow-x-auto rounded border border-slate-900 no-scrollbar max-h-48">
                          {sqlResult.columns.length === 0 ? (
                            <div className="text-[10px] text-slate-500 font-mono p-2 bg-slate-900/20">
                              Query executed successfully (0 rows returned).
                            </div>
                          ) : (
                            <table className="min-w-full text-[10px] text-left border-collapse select-text">
                              <thead className="bg-slate-900 text-slate-300 font-bold border-b border-slate-800">
                                <tr>
                                  {sqlResult.columns.map((col, idx) => (
                                    <th key={idx} className="px-2.5 py-1.5 border-r border-slate-800/40">{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="bg-slate-950/20">
                                {sqlResult.rows.slice(0, 5).map((row, rIdx) => (
                                  <tr key={rIdx} className="border-b border-slate-900/60 hover:bg-slate-900/35 transition-colors">
                                    {row.map((val, cIdx) => (
                                      <td key={cIdx} className="px-2.5 py-1.5 font-mono text-slate-400 border-r border-slate-800/40">
                                        {val === null ? <em className="text-slate-600 font-light">null</em> : String(val)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                          {sqlResult.rowCount > 5 && (
                            <div className="bg-slate-900/40 text-[9px] text-slate-500 px-2.5 py-1 text-center border-t border-slate-900/60 italic font-mono">
                              Showing top 5 rows out of {sqlResult.rowCount} total rows
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Word Bank */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wide">
                      Word Bank
                    </h3>
                    <div className="flex flex-wrap gap-2.5">
                      {wordBank.map((item) => {
                        const isTapped = tappedIds.includes(item.id);
                        
                        return (
                          <button
                            key={item.id}
                            disabled={isTapped || isAnswerChecked}
                            onClick={() => handleTapWordBank(item.id)}
                            className={`rounded-xl px-3 py-2 text-xs font-mono transition-all duration-150 text-left ${
                              isTapped
                                ? 'bg-[#06080e]/40 border border-slate-900 text-transparent pointer-events-none shadow-none select-none'
                                : 'bg-slate-900/80 border border-slate-800/80 text-slate-200 hover:border-slate-700 shadow-md active:scale-95'
                            }`}
                          >
                            {item.text}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Bottom Fixed Bar Sheet (DUOLINGO STYLE) */}
            <div className={`absolute bottom-0 left-0 right-0 p-5 border-t z-20 ${
              !isAnswerChecked 
                ? 'bg-[#0a0f1d] border-slate-900' 
                : isCorrect 
                  ? 'bg-[#061f14] border-emerald-800/40 animate-slide-up' 
                  : 'bg-[#220c0f] border-rose-800/40 animate-slide-up'
            }`}>
              
              {/* Checked Overlay Info */}
              {isAnswerChecked && (
                <div className="mb-4 text-left max-h-48 overflow-y-auto no-scrollbar pr-1 select-text">
                  <div className="flex items-center gap-2.5 mb-2">
                    {isCorrect ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
                    )}
                    <h2 className={`font-bold text-base ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isCorrect ? 'Awesome job! Correct!' : 'Incorrect. Study required!'}
                    </h2>
                  </div>

                  {/* Correct Solution reference on failure */}
                  {!isCorrect && activeQuestion.correct_answer && (
                    <div className="mb-3 p-3 bg-rose-950/20 border border-rose-500/10 rounded-xl">
                      <h4 className="text-[10px] font-bold text-rose-400/80 uppercase tracking-wider mb-1">Correct Answer:</h4>
                      <pre className="text-xs font-mono text-rose-300/90 whitespace-pre-wrap leading-relaxed select-text">
                        {Array.isArray(activeQuestion.correct_answer) 
                          ? activeQuestion.correct_answer.join('\n') 
                          : activeQuestion.correct_answer}
                      </pre>
                    </div>
                  )}
                  
                  {/* Explanation Section */}
                  <div className="flex gap-2 bg-slate-950/30 p-3 rounded-xl border border-slate-900/60 leading-relaxed text-xs">
                    <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <p className="text-slate-300 font-medium leading-relaxed select-text">
                      {activeQuestion.explanation}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {!isAnswerChecked ? (
                  <button
                    onClick={handleCheckAnswer}
                    disabled={
                      (activeQuestion.type === 'mcq' && !selectedOption) ||
                      (activeQuestion.type === 'interactive_coding' && tappedIds.length === 0)
                    }
                    className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide shadow-md transition-all duration-150 active:scale-[0.98] ${
                      ((activeQuestion.type === 'mcq' && selectedOption) ||
                       (activeQuestion.type === 'interactive_coding' && tappedIds.length > 0))
                        ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold shadow-sky-500/20 shadow-lg'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/30'
                    }`}
                  >
                    Check Answer
                  </button>
                ) : (
                  <button
                    onClick={handleContinue}
                    className={`w-full py-3.5 px-6 rounded-xl font-extrabold text-sm tracking-wide shadow-lg flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all duration-150 ${
                      isCorrect 
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20' 
                        : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                    }`}
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </button>
                )}
              </div>

            </div>

          </div>
        )}

        {/* --- SCREEN: SUMMARY --- */}
        {screen === 'summary' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in relative min-h-screen">
            
            {/* Visual Confetti Showers */}
            <Confetti />

            {/* Glowing Trophy Icon */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-3xl scale-150 -z-10 animate-pulse"></div>
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-slate-950 shadow-2xl ring-4 ring-amber-500/15">
                <Trophy className="w-12 h-12 stroke-[2]" />
              </div>
              <div className="absolute -top-2 -right-2 bg-sky-500 text-slate-950 font-black text-xs w-6 h-6 rounded-full border-2 border-slate-950 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
              </div>
            </div>

            <h1 className="text-2xl font-black text-slate-100 tracking-tight mb-2">
              Topic Practice Completed!
            </h1>
            <p className="text-slate-400 text-xs px-4 mb-8">
              Fantastic work practicing {selectedTopic}! You are one step closer to acing your interviews.
            </p>

            {/* Summary Statistics Card */}
            <div className="w-full glass rounded-2xl p-5 mb-8 border border-slate-800/80 shadow-2xl relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl -z-10"></div>
              
              <div className="grid grid-cols-2 gap-4 divide-x divide-slate-800">
                
                {/* XP Earned */}
                <div className="flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1.5 mb-1 text-amber-400 font-extrabold">
                    <Award className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-lg">+{sessionXpEarned}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">XP Earned</span>
                </div>
                
                {/* Accuracy */}
                <div className="flex flex-col items-center justify-center pl-4">
                  <div className="flex items-center gap-1.5 mb-1 text-emerald-400 font-extrabold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                    <span className="text-lg">{sessionCorrectCount} / {sessionQuestions.length}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Correct Answers</span>
                </div>

              </div>
            </div>

            {/* Overall totals row */}
            <div className="flex items-center justify-center gap-6 text-xs text-slate-400 font-semibold mb-10 bg-slate-900/35 border border-slate-900 px-5 py-2.5 rounded-full">
              <span className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                Streak: <strong className="text-slate-200">{streak} days</strong>
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-700"></span>
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500 fill-amber-500" />
                Total XP: <strong className="text-slate-200">{totalXp} XP</strong>
              </span>
            </div>

            {/* Back button */}
            <button
              onClick={() => { playTap(); setScreen('dashboard'); }}
              className="w-full py-4 px-6 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-sky-500/10 active:scale-[0.98] transition-all"
            >
              Continue to Dashboard
            </button>

          </div>
        )}

      </div>
    </div>
  );
}
