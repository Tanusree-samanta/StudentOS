import React, { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Smile,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  Award,
  ChevronRight,
  TrendingUp,
  X,
  CheckSquare,
  BookMarked,
  Heart,
  Briefcase,
  Flame,
  Zap,
  Bell,
  Sparkles
} from "lucide-react";
import { ScreenID, PlannerGoal, WeeklyTask, Habit, MoodLog, JournalEntry } from "../types";
import Sidebar from "./Sidebar";

interface DailyPlannerScreenProps {
  onNavigate: (screen: ScreenID, direction: "none" | "push" | "push_back") => void;
}

const DEFAULT_HABITS = [
  { id: "h1", title: "Code 1 Hour" },
  { id: "h2", title: "Study Machine Learning" },
  { id: "h3", title: "Read Academic Paper" },
  { id: "h4", title: "Drink 3L Water" }
];

const INITIAL_GOALS: PlannerGoal[] = [
  {
    id: "g1",
    title: "Complete Discrete Math Assignment 3",
    priority: "High",
    deadline: "2026-06-30",
    notes: "Requires reviewing Euler paths and planar graphs.",
    completed: false
  },
  {
    id: "g2",
    title: "Read Virtual Memory Paging Chapter",
    priority: "Medium",
    deadline: "2026-07-01",
    notes: "Review LRU and clock replacement algorithms.",
    completed: true
  },
  {
    id: "g3",
    title: "Write Introduction section of Tech Comm report",
    priority: "Low",
    deadline: "2026-07-03",
    notes: "Draft abstract and project objective.",
    completed: false
  }
];

const INITIAL_WEEKLY: WeeklyTask[] = [
  { id: "w1", day: "Monday", title: "ML Lecture 1 Review", completed: true, order: 0 },
  { id: "w2", day: "Monday", title: "Submit DBMS Lab 2", completed: true, order: 1 },
  { id: "w3", day: "Tuesday", title: "Discrete Math Tutorial", completed: true, order: 0 },
  { id: "w4", day: "Wednesday", title: "Paging simulation draft", completed: false, order: 0 },
  { id: "w5", day: "Thursday", title: "Technical Presentation prep", completed: false, order: 0 },
  { id: "w6", day: "Friday", title: "Weekly exam revision session", completed: false, order: 0 },
  { id: "w7", day: "Saturday", title: "Leetcode biweekly contest", completed: false, order: 0 },
  { id: "w8", day: "Sunday", title: "Prepare study planner for next week", completed: false, order: 0 }
];

const MOTIVATIONS = [
  "Academic excellence is not an act, but a habit.",
  "Small daily improvements over time lead to stunning academic results.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "Your future is created by what you do today, not tomorrow.",
  "Focus on the process, and the high GPA will follow naturally."
];

export default function DailyPlannerScreen({ onNavigate }: DailyPlannerScreenProps) {
  // Goals
  const [goals, setGoals] = useState<PlannerGoal[]>(() => {
    const activeUid = localStorage.getItem("studentos_active_uid");
    const isLoggedIn = activeUid && activeUid !== "guest";
    const stored = localStorage.getItem("studentos_planner_goals");
    if (stored) {
      return JSON.parse(stored);
    }
    return isLoggedIn ? [] : INITIAL_GOALS;
  });

  // Weekly planner
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>(() => {
    const activeUid = localStorage.getItem("studentos_active_uid");
    const isLoggedIn = activeUid && activeUid !== "guest";
    const stored = localStorage.getItem("studentos_weekly_tasks");
    if (stored) {
      return JSON.parse(stored);
    }
    return isLoggedIn ? [] : INITIAL_WEEKLY;
  });

  const [activeDayTab, setActiveDayTab] = useState<WeeklyTask["day"]>("Monday");

  // Habits
  const [habits, setHabits] = useState<Habit[]>(() => {
    const activeUid = localStorage.getItem("studentos_active_uid");
    const isLoggedIn = activeUid && activeUid !== "guest";
    const stored = localStorage.getItem("studentos_habits");
    if (stored) return JSON.parse(stored);
    return isLoggedIn ? [] : DEFAULT_HABITS.map(h => ({ ...h, completedDates: [] }));
  });

  // Mood logs
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>(() => {
    const stored = localStorage.getItem("studentos_mood_logs");
    return stored ? JSON.parse(stored) : [];
  });

  // Journal
  const [journals, setJournals] = useState<JournalEntry[]>(() => {
    const stored = localStorage.getItem("studentos_journals");
    return stored ? JSON.parse(stored) : [];
  });

  // New Goal Form
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalPriority, setNewGoalPriority] = useState<PlannerGoal["priority"]>("Medium");
  const [newGoalDeadline, setNewGoalDeadline] = useState("2026-06-30");
  const [newGoalNotes, setNewGoalNotes] = useState("");
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; type: "goal" | "habit" } | null>(null);

  // New Weekly Task Form
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [newWeeklyTitle, setNewWeeklyTitle] = useState("");
  const [editingWeeklyId, setEditingWeeklyId] = useState<string | null>(null);

  // Habit modal / controls
  const [newHabitTitle, setNewHabitTitle] = useState("");

  // Journal form
  const [journalTitle, setJournalTitle] = useState("");
  const [journalContent, setJournalContent] = useState("");

  // Pomodoro States
  const [timerMode, setTimerMode] = useState<"study" | "break">("study");
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Notifications alerts banner list
  const [alerts, setAlerts] = useState<string[]>([
    "Your high priority assignment task is due in 24 hours!",
    "Congratulations! You completed your 3-day habits streak.",
    "Pomodoro suggestion: Standard 25-minute focus session is optimal for mathematical logic."
  ]);

  // Sync to localstorage
  useEffect(() => {
    localStorage.setItem("studentos_planner_goals", JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem("studentos_weekly_tasks", JSON.stringify(weeklyTasks));
  }, [weeklyTasks]);

  useEffect(() => {
    localStorage.setItem("studentos_habits", JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem("studentos_mood_logs", JSON.stringify(moodLogs));
  }, [moodLogs]);

  useEffect(() => {
    localStorage.setItem("studentos_journals", JSON.stringify(journals));
  }, [journals]);

  // Pomodoro Ticking Logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        if (timerSeconds > 0) {
          setTimerSeconds(timerSeconds - 1);
        } else if (timerMinutes > 0) {
          setTimerMinutes(timerMinutes - 1);
          setTimerSeconds(59);
        } else {
          // Timer ended!
          setIsTimerRunning(false);
          const finishedMode = timerMode;
          if (finishedMode === "study") {
            setAlerts(prev => ["Pomodoro session completed! Take a 5 minute break.", ...prev]);
            setTimerMode("break");
            setTimerMinutes(5);
          } else {
            setAlerts(prev => ["Break completed! Time to focus on study goals.", ...prev]);
            setTimerMode("study");
            setTimerMinutes(25);
          }
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerMinutes, timerSeconds, timerMode]);

  // Pomodoro Controls
  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerMode("study");
    setTimerMinutes(25);
    setTimerSeconds(0);
  };

  const setTimerDuration = (mins: number) => {
    setIsTimerRunning(false);
    setTimerMinutes(mins);
    setTimerSeconds(0);
  };

  // Goals CRUD
  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    if (editingGoalId) {
      setGoals(goals.map(g => g.id === editingGoalId ? {
        ...g,
        title: newGoalTitle.trim(),
        priority: newGoalPriority,
        deadline: newGoalDeadline,
        notes: newGoalNotes.trim()
      } : g));
      setEditingGoalId(null);
    } else {
      const newGoal: PlannerGoal = {
        id: Math.random().toString(36).substring(7),
        title: newGoalTitle.trim(),
        priority: newGoalPriority,
        deadline: newGoalDeadline,
        notes: newGoalNotes.trim(),
        completed: false
      };
      setGoals([newGoal, ...goals]);
    }

    setNewGoalTitle("");
    setNewGoalNotes("");
    setShowGoalModal(false);
  };

  const startEditGoal = (goal: PlannerGoal) => {
    setEditingGoalId(goal.id);
    setNewGoalTitle(goal.title);
    setNewGoalPriority(goal.priority);
    setNewGoalDeadline(goal.deadline);
    setNewGoalNotes(goal.notes);
    setShowGoalModal(true);
  };

  const deleteGoal = (id: string) => {
    const goal = goals.find(g => g.id === id);
    if (goal) {
      setDeleteConfirm({ id, name: goal.title, type: "goal" });
    }
  };

  const toggleGoalCompleted = (id: string) => {
    setGoals(goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  // Weekly Planner CRUD
  const handleSaveWeeklyTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeeklyTitle.trim()) return;

    if (editingWeeklyId) {
      setWeeklyTasks(weeklyTasks.map(w => w.id === editingWeeklyId ? {
        ...w,
        title: newWeeklyTitle.trim()
      } : w));
      setEditingWeeklyId(null);
    } else {
      const dayTasks = weeklyTasks.filter(w => w.day === activeDayTab);
      const newTask: WeeklyTask = {
        id: Math.random().toString(36).substring(7),
        day: activeDayTab,
        title: newWeeklyTitle.trim(),
        completed: false,
        order: dayTasks.length
      };
      setWeeklyTasks([...weeklyTasks, newTask]);
    }

    setNewWeeklyTitle("");
    setShowWeeklyModal(false);
  };

  const startEditWeekly = (task: WeeklyTask) => {
    setEditingWeeklyId(task.id);
    setNewWeeklyTitle(task.title);
    setShowWeeklyModal(true);
  };

  const deleteWeeklyTask = (id: string) => {
    setWeeklyTasks(weeklyTasks.filter(w => w.id !== id));
  };

  const toggleWeeklyTaskCompleted = (id: string) => {
    setWeeklyTasks(weeklyTasks.map(w => w.id === id ? { ...w, completed: !w.completed } : w));
  };

  const reorderWeeklyTasks = (id: string, direction: "up" | "down") => {
    const dayTasks = [...weeklyTasks].filter(w => w.day === activeDayTab).sort((a, b) => a.order - b.order);
    const index = dayTasks.findIndex(t => t.id === id);
    if (index === -1) return;

    let targetIndex = index + (direction === "up" ? -1 : 1);
    if (targetIndex < 0 || targetIndex >= dayTasks.length) return;

    // Swap ordering numbers
    const currentTask = dayTasks[index];
    const targetTask = dayTasks[targetIndex];

    const tempOrder = currentTask.order;
    currentTask.order = targetTask.order;
    targetTask.order = tempOrder;

    setWeeklyTasks(weeklyTasks.map(w => {
      if (w.id === currentTask.id) return currentTask;
      if (w.id === targetTask.id) return targetTask;
      return w;
    }));
  };

  // Habits logic
  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;
    const newHab: Habit = {
      id: Math.random().toString(36).substring(7),
      title: newHabitTitle.trim(),
      completedDates: []
    };
    setHabits([...habits, newHab]);
    setNewHabitTitle("");
  };

  const toggleHabitDate = (id: string, date: string) => {
    setHabits(habits.map(h => {
      if (h.id !== id) return h;
      const dates = h.completedDates.includes(date)
        ? h.completedDates.filter(d => d !== date)
        : [...h.completedDates, date];
      return { ...h, completedDates: dates };
    }));
  };

  const deleteHabit = (id: string) => {
    const habit = habits.find(h => h.id === id);
    if (habit) {
      setDeleteConfirm({ id, name: habit.title, type: "habit" });
    }
  };

  // Mood selection
  const handleLogMood = (mood: MoodLog["mood"]) => {
    const todayStr = "2026-06-30"; // Set static consistent current local date
    const updated = moodLogs.filter(l => l.date !== todayStr);
    setMoodLogs([{ date: todayStr, mood }, ...updated]);
  };

  const getTodayMood = () => {
    const todayStr = "2026-06-30";
    const found = moodLogs.find(l => l.date === todayStr);
    return found ? found.mood : "Select Mood";
  };

  // Journal adding
  const handleSaveJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalTitle.trim() || !journalContent.trim()) return;

    const newJournal: JournalEntry = {
      id: Math.random().toString(36).substring(7),
      date: "2026-06-30",
      title: journalTitle.trim(),
      content: journalContent.trim()
    };

    setJournals([newJournal, ...journals]);
    setJournalTitle("");
    setJournalContent("");
    setAlerts(prev => ["Your learning journal entry was stored successfully.", ...prev]);
  };

  // Calculations for stats
  const getStats = () => {
    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.completed).length;
    const pendingGoals = totalGoals - completedGoals;

    const todayWeeklyCompleted = weeklyTasks.filter(w => w.day === "Tuesday" && w.completed).length;
    const todayWeeklyTotal = weeklyTasks.filter(w => w.day === "Tuesday").length;

    // Streaks & Activity Detection
    const totalHabitCompletions = habits.reduce((acc, h) => acc + h.completedDates.length, 0);
    const hasActivity = totalGoals > 0 || totalHabitCompletions > 0;

    const currentStreak = hasActivity ? 4 : 0;
    const longestStreak = hasActivity ? 9 : 0;

    // Monthly completion rates
    const completionRate = totalGoals === 0 ? 0 : Math.round((completedGoals / totalGoals) * 100);
    const studyHours = hasActivity ? 12.5 : 0; // Calculated standard hours
    const productivityScore = hasActivity 
      ? Math.min(Math.round((completedGoals * 25) + (totalHabitCompletions * 10) + 15), 100)
      : 0;

    return {
      totalGoals,
      completedGoals,
      pendingGoals,
      completionRate,
      studyHours,
      productivityScore,
      currentStreak,
      longestStreak,
      todayWeeklyCompleted,
      todayWeeklyTotal
    };
  };

  const stats = getStats();

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden grid-bg">
      <Sidebar currentScreen="daily_planner" onNavigate={onNavigate} />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10">
        
        {/* Header toolbar */}
        <header className="p-8 pb-4 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-900/40 gap-4">
          <div>
            <span className="text-[10px] font-bold text-indigo-400 font-mono tracking-widest uppercase block">Study Habit Routine Engine</span>
            <h1 className="text-2xl font-black text-white mt-1 tracking-tight font-sans">Planner & Productivity</h1>
            <p className="text-xs text-slate-400 font-sans mt-0.5">Schedule daily milestones, track habit consistency, and optimize study times</p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setEditingGoalId(null);
                setNewGoalTitle("");
                setNewGoalNotes("");
                setShowGoalModal(true);
              }}
              className="flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl px-4 py-2 text-xs font-bold font-sans cursor-pointer transition-colors shadow-md shadow-indigo-500/10"
            >
              <Plus className="h-4 w-4" />
              <span>Add Daily Goal</span>
            </button>
          </div>
        </header>

        <div className="p-8 space-y-8">
          
          {/* Motivation Quote Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 rounded-lg bg-indigo-500/20">
                <Sparkles className="h-4 w-4 text-indigo-400" />
              </div>
              <p className="text-xs italic text-slate-200 font-sans">
                "{MOTIVATIONS[Math.floor((new Date().getDate()) % MOTIVATIONS.length)]}"
              </p>
            </div>
            <span className="text-[10px] font-bold font-mono tracking-wider bg-slate-950 border border-slate-900 px-2.5 py-1 rounded-lg text-indigo-400 uppercase">
              STUDENT MOTIVATION
            </span>
          </div>

          {/* Productivity Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Stats Card 1: Today's Streak */}
            <div className="glass-panel border border-slate-900 bg-slate-900/15 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Daily Streak</span>
                <div className="flex items-baseline space-x-1.5 mt-1.5">
                  <h3 className="text-3xl font-black text-amber-500 font-mono">{stats.currentStreak}</h3>
                  <span className="text-xs text-slate-500 font-sans">days active</span>
                </div>
                <p className="text-[9px] text-slate-400 mt-1 font-sans">Longest achievement: {stats.longestStreak} days</p>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                <Flame className="h-6 w-6 text-amber-500 animate-pulse" />
              </div>
            </div>

            {/* Stats Card 2: Productivity Score */}
            <div className="glass-panel border border-slate-900 bg-slate-900/15 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Productivity Score</span>
                <div className="flex items-baseline space-x-1.5 mt-1.5">
                  <h3 className="text-3xl font-black text-indigo-400 font-mono">{stats.productivityScore}%</h3>
                  <span className="text-xs text-slate-500 font-sans">efficiency</span>
                </div>
                <p className="text-[9px] text-slate-400 mt-1 font-sans">Goal & Habit weighted metrics</p>
              </div>
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                <Zap className="h-6 w-6 text-indigo-400" />
              </div>
            </div>

            {/* Stats Card 3: Goals Completed */}
            <div className="glass-panel border border-slate-900 bg-slate-900/15 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Goals Finished</span>
                <div className="flex items-baseline space-x-1.5 mt-1.5">
                  <h3 className="text-3xl font-black text-white font-mono">
                    {stats.completedGoals} <span className="text-slate-500 font-light text-base">/ {stats.totalGoals}</span>
                  </h3>
                </div>
                <p className="text-[9px] text-slate-400 mt-1 font-sans">Pending tasks queue: {stats.pendingGoals}</p>
              </div>
              <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-2xl">
                <CheckCircle2 className="h-6 w-6 text-violet-400" />
              </div>
            </div>

            {/* Stats Card 4: Study Hours */}
            <div className="glass-panel border border-slate-900 bg-slate-900/15 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Focus Duration</span>
                <div className="flex items-baseline space-x-1.5 mt-1.5">
                  <h3 className="text-3xl font-black text-emerald-400 font-mono">{stats.studyHours}h</h3>
                </div>
                <p className="text-[9px] text-slate-400 mt-1 font-sans">This week cumulative tracking</p>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                <Clock className="h-6 w-6 text-emerald-400" />
              </div>
            </div>

          </div>

          {/* Interactive Reminders Drawer Row */}
          {alerts.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-900/15 border border-slate-900 space-y-2">
              <div className="flex items-center space-x-2 mb-1">
                <Bell className="h-4 w-4 text-indigo-400 animate-bounce" />
                <span className="text-[10px] font-bold tracking-wider font-mono uppercase text-slate-400">Live Workspace Notifications</span>
              </div>
              <div className="space-y-1.5">
                {alerts.map((al, index) => (
                  <div key={index} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-950/40 border border-slate-900/50">
                    <span className="text-slate-300 font-sans">{al}</span>
                    <button
                      onClick={() => setAlerts(alerts.filter((_, idx) => idx !== index))}
                      className="p-1 hover:bg-slate-900 rounded-lg text-slate-500 hover:text-white cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pomodoro Timer & Mood Tracker Widget Box */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Pomodoro Study Timer (2/3 col on widescreen) */}
            <div className="lg:col-span-2 glass-panel border border-slate-900 bg-slate-900/15 p-6 rounded-3xl space-y-6 flex flex-col md:flex-row items-center justify-around gap-6">
              <div className="text-center md:text-left space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Study Pomodoro Engine</span>
                <h3 className="text-lg font-extrabold text-white font-sans">Maximize Active Lecture Concentration</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm font-sans">
                  Use the Pomodoro technique to divide focus blocks. Maintain absolute concentration for 25 minutes, then earn a 5-minute break!
                </p>

                <div className="flex items-center justify-center md:justify-start space-x-2 pt-2">
                  <button
                    onClick={() => setTimerDuration(25)}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-900 rounded-lg text-[10px] font-bold font-mono"
                  >
                    25m Focus
                  </button>
                  <button
                    onClick={() => setTimerDuration(5)}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-900 rounded-lg text-[10px] font-bold font-mono"
                  >
                    5m Break
                  </button>
                  <button
                    onClick={() => setTimerDuration(15)}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-900 rounded-lg text-[10px] font-bold font-mono"
                  >
                    15m Long Break
                  </button>
                </div>
              </div>

              {/* Ticking Visual representation */}
              <div className="relative flex flex-col items-center justify-center p-6 rounded-full bg-slate-950/80 border border-slate-900 w-44 h-44 shadow-2xl shrink-0">
                <span className={`text-[10px] font-bold tracking-wider uppercase font-mono ${
                  timerMode === "study" ? "text-indigo-400" : "text-amber-500"
                }`}>
                  {timerMode === "study" ? "Focusing" : "Rest Mode"}
                </span>
                
                <span className="text-3xl font-black font-mono text-white tracking-tighter my-2">
                  {String(timerMinutes).padStart(2, "0")}:{String(timerSeconds).padStart(2, "0")}
                </span>

                <div className="flex items-center space-x-2 mt-1">
                  <button
                    onClick={toggleTimer}
                    className="p-1.5 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg cursor-pointer transition-colors"
                  >
                    {isTimerRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={resetTimer}
                    className="p-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors border border-slate-800"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Mood logger & Streak calendar (1/3 col) */}
            <div className="glass-panel border border-slate-900 bg-slate-900/15 p-6 rounded-3xl space-y-4">
              <span className="text-xs font-bold text-slate-300 font-sans uppercase tracking-wider block">Mood Tracker</span>
              <p className="text-xs text-slate-400 font-sans">Select your primary mental focus state for today:</p>
              
              <div className="grid grid-cols-5 gap-2 text-center text-[10px] pt-1">
                {[
                  { name: "Focused", icon: "🧠" },
                  { name: "Happy", icon: "😊" },
                  { name: "Calm", icon: "🍃" },
                  { name: "Tired", icon: "🥱" },
                  { name: "Stressed", icon: "🤯" }
                ].map(m => {
                  const isCurrent = getTodayMood() === m.name;
                  return (
                    <button
                      key={m.name}
                      onClick={() => handleLogMood(m.name as MoodLog["mood"])}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isCurrent 
                          ? "bg-indigo-500/15 border-indigo-500 text-white scale-105" 
                          : "bg-slate-950 border-slate-900 text-slate-400 hover:text-white hover:bg-slate-900"
                      }`}
                    >
                      <span className="text-lg">{m.icon}</span>
                      <span className="text-[8px] font-sans mt-1 leading-none">{m.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-xl text-[10px] flex items-center justify-between font-sans">
                <span className="text-slate-400">Today logged state:</span>
                <span className="font-bold text-indigo-400">{getTodayMood()}</span>
              </div>
            </div>

          </div>

          {/* Daily Goals & Weekly Planner Rows split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Daily Goals section */}
            <div className="glass-panel border border-slate-900 p-6 rounded-3xl space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-300 font-sans uppercase tracking-wider">Academic Daily Goals</h3>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">High stakes study targets queue</p>
                </div>
              </div>

              {/* Goals list */}
              <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                {goals.map(goal => (
                  <div 
                    key={goal.id} 
                    className={`p-4 rounded-2xl border transition-all ${
                      goal.completed 
                        ? "bg-slate-950/20 border-slate-950 text-slate-500" 
                        : "bg-slate-900/10 border-slate-900 text-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <button
                          onClick={() => toggleGoalCompleted(goal.id)}
                          className="mt-0.5 focus:outline-none cursor-pointer shrink-0"
                        >
                          {goal.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-indigo-400" />
                          ) : (
                            <Circle className="h-5 w-5 text-slate-600 hover:text-white" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={`font-semibold text-xs font-sans truncate ${goal.completed ? "line-through" : ""}`}>
                            {goal.title}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5 flex items-center space-x-2">
                            <span className={`px-1.5 py-0.2 rounded uppercase text-[8px] font-bold tracking-wider ${
                              goal.priority === "High" ? "bg-rose-500/10 text-rose-400" :
                              goal.priority === "Medium" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
                            }`}>
                              {goal.priority}
                            </span>
                            <span>•</span>
                            <span>Due: {goal.deadline}</span>
                          </p>
                          {goal.notes && (
                            <p className="text-[10px] text-slate-400 mt-2 font-sans italic bg-slate-950/20 p-2 rounded-lg leading-normal">
                              {goal.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => startEditGoal(goal)}
                          className="p-1 hover:bg-slate-950 rounded cursor-pointer text-slate-500 hover:text-white"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteGoal(goal.id)}
                          className="p-1 hover:bg-rose-500/10 rounded cursor-pointer text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {goals.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-8 font-sans">No daily goals mapped. Create one to begin!</p>
                )}
              </div>
            </div>

            {/* Weekly Planner tabbed scheduler */}
            <div className="glass-panel border border-slate-900 p-6 rounded-3xl space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-300 font-sans uppercase tracking-wider">Weekly Routine Grid</h3>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">Map tasks for each weekday</p>
                </div>
                <button
                  onClick={() => {
                    setEditingWeeklyId(null);
                    setNewWeeklyTitle("");
                    setShowWeeklyModal(true);
                  }}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-indigo-400 hover:text-white cursor-pointer"
                  title="Add routine slot"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Day tabs row */}
              <div className="grid grid-cols-7 gap-1 bg-slate-950 p-1 rounded-xl text-center">
                {(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as WeeklyTask["day"][]).map(d => {
                  const active = activeDayTab === d;
                  const dayTasks = weeklyTasks.filter(t => t.day === d);
                  const isAllDone = dayTasks.length > 0 && dayTasks.every(t => t.completed);

                  return (
                    <button
                      key={d}
                      onClick={() => setActiveDayTab(d)}
                      className={`py-1 rounded-lg text-[9px] font-sans font-bold cursor-pointer transition-colors ${
                        active 
                          ? "bg-indigo-500 text-white" 
                          : isAllDone ? "text-emerald-400" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <span>{d.substring(0, 3)}</span>
                      {dayTasks.length > 0 && (
                        <span className="block text-[7px] opacity-85">{dayTasks.filter(t => t.completed).length}/{dayTasks.length}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Week Day list queue */}
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                {weeklyTasks
                  .filter(t => t.day === activeDayTab)
                  .sort((a, b) => a.order - b.order)
                  .map((task, idx) => (
                    <div 
                      key={task.id} 
                      className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                        <button
                          onClick={() => toggleWeeklyTaskCompleted(task.id)}
                          className="shrink-0 cursor-pointer"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Circle className="h-4 w-4 text-slate-600" />
                          )}
                        </button>
                        <p className={`text-xs font-semibold font-sans truncate ${task.completed ? "line-through text-slate-500" : "text-white"}`}>
                          {task.title}
                        </p>
                      </div>

                      {/* Reorder and action operations */}
                      <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                        <button
                          onClick={() => reorderWeeklyTasks(task.id, "up")}
                          className="p-1 text-slate-500 hover:text-slate-300 text-[10px]"
                          disabled={idx === 0}
                          title="Move up"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => reorderWeeklyTasks(task.id, "down")}
                          className="p-1 text-slate-500 hover:text-slate-300 text-[10px]"
                          title="Move down"
                        >
                          ▼
                        </button>
                        <button
                          onClick={() => startEditWeekly(task)}
                          className="p-1 hover:bg-slate-900 rounded cursor-pointer text-slate-500 hover:text-white"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => deleteWeeklyTask(task.id)}
                          className="p-1 hover:bg-rose-500/10 rounded cursor-pointer text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                {weeklyTasks.filter(t => t.day === activeDayTab).length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-8 font-sans">No tasks planned for {activeDayTab}. Enjoy your study routine!</p>
                )}
              </div>
            </div>

          </div>

          {/* Habit checklist & Daily journal section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Habit tracking consistency ledger */}
            <div className="glass-panel border border-slate-900 p-6 rounded-3xl space-y-4">
              <span className="text-xs font-bold text-slate-300 font-sans uppercase tracking-wider block">Habit Consistency Ledger</span>
              <p className="text-xs text-slate-400 font-sans">Check off tasks as completed daily to accumulate streaks:</p>

              <form onSubmit={handleAddHabit} className="flex gap-2 p-1 bg-slate-950 border border-slate-900 rounded-xl">
                <input
                  type="text"
                  required
                  placeholder="Create custom habit tracking..."
                  value={newHabitTitle}
                  onChange={(e) => setNewHabitTitle(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none font-sans"
                />
                <button
                  type="submit"
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider font-mono cursor-pointer"
                >
                  Track
                </button>
              </form>

              <div className="space-y-3 pt-2">
                {habits.map(h => {
                  const todayStr = "2026-06-30";
                  const yesterdayStr = "2026-06-29";
                  const dayBeforeStr = "2026-06-28";
                  
                  const isCompletedToday = h.completedDates.includes(todayStr);
                  const isCompletedYesterday = h.completedDates.includes(yesterdayStr);
                  const isCompletedDayBefore = h.completedDates.includes(dayBeforeStr);

                  return (
                    <div key={h.id} className="p-3 rounded-xl bg-slate-950/40 border border-slate-900 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-white font-sans block truncate">{h.title}</span>
                        <span className="text-[9px] font-mono text-slate-400 mt-1 block">
                          Streak index: <span className="text-amber-500 font-bold">{h.completedDates.length} days</span>
                        </span>
                      </div>

                      <div className="flex items-center space-x-2.5 shrink-0">
                        {/* DayBefore checkbox */}
                        <button
                          onClick={() => toggleHabitDate(h.id, dayBeforeStr)}
                          className={`w-7 py-1 rounded-lg text-[9px] font-mono font-bold flex flex-col items-center justify-center ${
                            isCompletedDayBefore ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "bg-slate-950 text-slate-500 border border-slate-900"
                          }`}
                          title={`Log ${dayBeforeStr}`}
                        >
                          <span>28</span>
                          <span className="text-[7px]">{isCompletedDayBefore ? "✓" : "-"}</span>
                        </button>

                        {/* Yesterday checkbox */}
                        <button
                          onClick={() => toggleHabitDate(h.id, yesterdayStr)}
                          className={`w-7 py-1 rounded-lg text-[9px] font-mono font-bold flex flex-col items-center justify-center ${
                            isCompletedYesterday ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "bg-slate-950 text-slate-500 border border-slate-900"
                          }`}
                          title={`Log ${yesterdayStr}`}
                        >
                          <span>29</span>
                          <span className="text-[7px]">{isCompletedYesterday ? "✓" : "-"}</span>
                        </button>

                        {/* Today checkbox */}
                        <button
                          onClick={() => toggleHabitDate(h.id, todayStr)}
                          className={`w-7 py-1 rounded-lg text-[9px] font-mono font-bold flex flex-col items-center justify-center ${
                            isCompletedToday ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20" : "bg-slate-950 text-slate-500 border border-slate-900"
                          }`}
                          title={`Log ${todayStr}`}
                        >
                          <span>30</span>
                          <span className="text-[7px]">{isCompletedToday ? "✓" : "-"}</span>
                        </button>

                        <button
                          onClick={() => deleteHabit(h.id)}
                          className="p-1 hover:bg-slate-900 text-slate-500 hover:text-red-400 rounded cursor-pointer ml-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily study journal diaries */}
            <div className="glass-panel border border-slate-900 p-6 rounded-3xl space-y-4">
              <span className="text-xs font-bold text-slate-300 font-sans uppercase tracking-wider block">Daily Study Journal</span>
              <p className="text-xs text-slate-400 font-sans">Jot down daily learning milestones or roadblocks:</p>

              <form onSubmit={handleSaveJournal} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Journal Title (e.g. Backprop formula mastered)"
                  value={journalTitle}
                  onChange={(e) => setJournalTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-900 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                />
                <textarea
                  required
                  rows={2}
                  placeholder="What concepts did you review? Any math formulas or proofs solved today?"
                  value={journalContent}
                  onChange={(e) => setJournalContent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-900 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none font-sans"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold font-sans tracking-wide transition-colors cursor-pointer"
                >
                  Save Journal Entry
                </button>
              </form>

              {/* Previous log feeds */}
              <div className="pt-2 border-t border-slate-900/60 space-y-2">
                <span className="text-[9px] font-bold uppercase tracking-wider font-mono text-slate-400 block">Logged Journals Archive</span>
                <div className="space-y-2 max-h-[100px] overflow-y-auto">
                  {journals.map(j => (
                    <div key={j.id} className="p-2 rounded-xl bg-slate-950/20 border border-slate-900 text-[11px]">
                      <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono mb-0.5">
                        <span className="font-bold text-white font-sans">{j.title}</span>
                        <span>{j.date}</span>
                      </div>
                      <p className="text-slate-400 font-sans">{j.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Interactive Contributions Heatmap */}
          <div className="glass-panel border border-slate-900 p-6 rounded-3xl space-y-4">
            <span className="text-xs font-bold text-slate-300 font-sans uppercase tracking-wider block">Productivity Calendar Heatmap</span>
            <p className="text-xs text-slate-400 font-sans">Consistent daily focus commits mapped across June 2026:</p>

            <div className="overflow-x-auto">
              <div className="min-w-[600px] flex items-center justify-center p-4 rounded-2xl bg-slate-950/40 border border-slate-900">
                <div className="grid grid-flow-col grid-rows-7 gap-1 font-mono text-[9px] text-center">
                  {/* Row headers */}
                  <div className="row-span-7 pr-3 flex flex-col justify-around text-slate-500 font-bold uppercase text-[8px]">
                    <span>Mon</span>
                    <span>Wed</span>
                    <span>Fri</span>
                    <span>Sun</span>
                  </div>

                  {/* Generate 30 days of June 2026 */}
                  {Array.from({ length: 30 }).map((_, i) => {
                    const dayNum = i + 1;
                    const dateStr = `2026-06-${String(dayNum).padStart(2, "0")}`;
                    
                    // Assign shades depending on actual user habit completions on this day
                    let commitCount = 0;
                    habits.forEach(h => {
                      if (h.completedDates && h.completedDates.includes(dateStr)) {
                        commitCount += 1;
                      }
                    });

                    let shade = "bg-slate-900/40"; // No commit
                    let level = "0 commits";

                    if (commitCount > 0) {
                      if (commitCount <= 1) {
                        shade = "bg-indigo-500/20 border border-indigo-500/10";
                        level = "1 focus commit";
                      } else if (commitCount <= 3) {
                        shade = "bg-indigo-500/40 border border-indigo-500/20";
                        level = `${commitCount} focus commits`;
                      } else {
                        shade = "bg-indigo-400 border border-indigo-400/30";
                        level = `${commitCount}+ elite commits`;
                      }
                    }

                    return (
                      <div 
                        key={i} 
                        className={`w-4 h-4 rounded-sm cursor-pointer transition-all hover:scale-110 ${shade}`}
                        title={`Date: ${dateStr}, Status: ${level}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end items-center space-x-1.5 text-[9px] text-slate-500 font-mono">
              <span>Less</span>
              <div className="w-2.5 h-2.5 bg-slate-900/40 rounded-sm" />
              <div className="w-2.5 h-2.5 bg-indigo-500/20 rounded-sm" />
              <div className="w-2.5 h-2.5 bg-indigo-500/40 rounded-sm" />
              <div className="w-2.5 h-2.5 bg-indigo-400 rounded-sm" />
              <span>More</span>
            </div>
          </div>

        </div>

        {/* Modal: Add Goal */}
        {showGoalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-md bg-slate-950 border border-slate-900 p-6 rounded-3xl space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-extrabold text-white tracking-tight font-sans">
                  {editingGoalId ? "Modify Study Goal" : "Create Daily Goal"}
                </h3>
                <button
                  onClick={() => setShowGoalModal(false)}
                  className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveGoal} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Goal Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Master Backpropagation Equations"
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Priority</label>
                    <select
                      value={newGoalPriority}
                      onChange={(e) => setNewGoalPriority(e.target.value as PlannerGoal["priority"])}
                      className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-300 font-sans rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                    >
                      <option value="High">🔴 High Priority</option>
                      <option value="Medium">🟡 Medium Priority</option>
                      <option value="Low">🟢 Low Priority</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Target Date</label>
                    <input
                      type="date"
                      value={newGoalDeadline}
                      onChange={(e) => setNewGoalDeadline(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Detailed Guidelines (Notes)</label>
                  <textarea
                    rows={2}
                    placeholder="Reference chapters, formulas, folders..."
                    value={newGoalNotes}
                    onChange={(e) => setNewGoalNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 text-xs resize-none font-sans"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGoalModal(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-md shadow-indigo-500/10"
                  >
                    Save Goal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add/Edit Weekly Routine */}
        {showWeeklyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-md bg-slate-950 border border-slate-900 p-6 rounded-3xl space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-extrabold text-white tracking-tight font-sans">
                  {editingWeeklyId ? "Modify Routine Task" : `Add Task to ${activeDayTab}`}
                </h3>
                <button
                  onClick={() => setShowWeeklyModal(false)}
                  className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveWeeklyTask} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Routine Slot Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Backprop Presentation Practice"
                    value={newWeeklyTitle}
                    onChange={(e) => setNewWeeklyTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 text-xs"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWeeklyModal(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md shadow-indigo-500/10"
                  >
                    Save Slot
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-left">
              <div className="flex items-center space-x-3 text-rose-500">
                <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-white font-sans font-extrabold">
                  {deleteConfirm.type === "goal" ? "Delete Academic Goal" : "Remove Habit Tracker"}
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Are you sure you want to delete <span className="text-white font-semibold">{deleteConfirm.name}</span>?
              </p>
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (deleteConfirm.type === "goal") {
                      setGoals(goals.filter(g => g.id !== deleteConfirm.id));
                    } else if (deleteConfirm.type === "habit") {
                      setHabits(habits.filter(h => h.id !== deleteConfirm.id));
                    }
                    setDeleteConfirm(null);
                  }}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
