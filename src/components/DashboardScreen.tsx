import React, { useState, useEffect } from "react";
import {
  Calendar,
  Award,
  Clock,
  Flame,
  ChevronRight,
  TrendingUp,
  Play,
  PenSquare,
  Bot,
  Plus,
  Trash2,
  Edit3,
  FileText,
  Files,
  UploadCloud,
  CheckCircle,
  X,
  AlertTriangle,
  Sparkles,
  BookOpen
} from "lucide-react";
import { ScreenID, Exam } from "../types";
import Sidebar from "./Sidebar";
import EmptyState from "./EmptyState";

interface DashboardScreenProps {
  onNavigate: (screen: ScreenID, direction: "none" | "push" | "push_back") => void;
  attendancePercent: number;
  cgpaVal: number;
  userName: string;
  syncTrigger?: number;
}

const INITIAL_EXAMS: Exam[] = [
  {
    id: "ex1",
    subject: "Discrete Mathematics",
    date: "2026-07-04", // 4 days from June 30, 2026
    time: "09:30 AM",
    room: "Block C, Hall 4",
    semester: "Semester 4",
    examType: "Final",
    completed: false
  },
  {
    id: "ex2",
    subject: "Operating Systems",
    date: "2026-07-08", // 8 days from June 30, 2026
    time: "02:00 PM",
    room: "Lab 3, Block A",
    semester: "Semester 4",
    examType: "Final",
    completed: false
  },
  {
    id: "ex3",
    subject: "Database Management Systems",
    date: "2026-07-14", // 14 days from June 30, 2026
    time: "11:00 AM",
    room: "Seminar Room 1",
    semester: "Semester 4",
    examType: "Final",
    completed: false
  }
];

export default function DashboardScreen({ onNavigate, attendancePercent, cgpaVal, userName, syncTrigger }: DashboardScreenProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);

  useEffect(() => {
    const msg = localStorage.getItem("studentos_welcome_msg");
    if (msg) {
      setWelcomeMessage(msg);
      localStorage.removeItem("studentos_welcome_msg");
    }
  }, []);
  
  // Load semesters cumulative CGPA if updated
  const [currentCgpa, setCurrentCgpa] = useState(() => {
    const activeUid = localStorage.getItem("studentos_active_uid");
    const isLoggedIn = activeUid && activeUid !== "guest";
    const stored = localStorage.getItem("studentos_cumulative_cgpa");
    if (stored !== null && stored !== "") {
      return Number(stored);
    }
    return isLoggedIn ? 0 : cgpaVal;
  });

  // Exams state
  const [exams, setExams] = useState<Exam[]>(() => {
    const activeUid = localStorage.getItem("studentos_active_uid");
    const isLoggedIn = activeUid && activeUid !== "guest";
    const stored = localStorage.getItem("studentos_exams");
    if (stored) {
      return JSON.parse(stored);
    }
    return isLoggedIn ? [] : INITIAL_EXAMS;
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Extra workspace states for detecting brand new / empty user and dynamic list rendering
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [notesList, setNotesList] = useState<any[]>([]);
  const [timetableList, setTimetableList] = useState<any[]>([]);
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [goalsList, setGoalsList] = useState<any[]>([]);

  useEffect(() => {
    const loadData = () => {
      try {
        const subs = localStorage.getItem("studentos_subjects");
        setSubjectsList(subs ? JSON.parse(subs) : []);

        const nts = localStorage.getItem("studentos_subject_files");
        const mappedFiles = nts ? JSON.parse(nts).map((f: any) => ({
          id: f.id,
          title: f.fileName,
          category: f.subjectName,
          updatedAt: f.uploadDate || "Recent"
        })) : [];
        setNotesList(mappedFiles);

        const tt = localStorage.getItem("studentos_timetable");
        let parsedTt = tt ? JSON.parse(tt) : [];
        if (Array.isArray(parsedTt)) {
          parsedTt = parsedTt.filter((item: any) => item && item.id && !item.id.toString().startsWith("r"));
        }
        setTimetableList(parsedTt);

        const tsk = localStorage.getItem("studentos_weekly_tasks");
        setTasksList(tsk ? JSON.parse(tsk) : []);

        const gls = localStorage.getItem("studentos_planner_goals");
        setGoalsList(gls ? JSON.parse(gls) : []);

        const activeUid = localStorage.getItem("studentos_active_uid");
        const isLoggedIn = activeUid && activeUid !== "guest";

        const storedCgpa = localStorage.getItem("studentos_cumulative_cgpa");
        if (storedCgpa !== null && storedCgpa !== "") {
          setCurrentCgpa(Number(storedCgpa));
        } else {
          setCurrentCgpa(isLoggedIn ? 0 : cgpaVal);
        }

        const storedExams = localStorage.getItem("studentos_exams");
        if (storedExams) {
          setExams(JSON.parse(storedExams));
        } else {
          setExams(isLoggedIn ? [] : INITIAL_EXAMS);
        }
      } catch (err) {
        console.error("Error parsing local storage in DashboardScreen:", err);
      }
    };
    loadData();
    
    // Listen to window focus to auto-update when returning to dashboard
    window.addEventListener("focus", loadData);
    return () => window.removeEventListener("focus", loadData);
  }, [syncTrigger, cgpaVal]);

  const isWorkspaceEmpty = subjectsList.length === 0 && notesList.length === 0 && timetableList.length === 0 && tasksList.length === 0 && goalsList.length === 0 && exams.length === 0;

  // Modal forms
  const [showExamModal, setShowExamModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "scanning" | "done">("idle");
  const [scannedFileName, setScannedFileName] = useState("");

  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examSubject, setExamSubject] = useState("");
  const [examDate, setExamDate] = useState("2026-07-04");
  const [examTime, setExamTime] = useState("09:30 AM");
  const [examRoom, setExamRoom] = useState("");
  const [examSemester, setExamSemester] = useState("Semester 4");
  const [examType, setExamType] = useState<Exam["examType"]>("Final");

  // Pomodoro
  const [activeTimer, setActiveTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(1500); // 25 mins

  // Sync state changes
  useEffect(() => {
    localStorage.setItem("studentos_exams", JSON.stringify(exams));
  }, [exams]);

  // Keep CGPA synced
  useEffect(() => {
    const stored = localStorage.getItem("studentos_cumulative_cgpa");
    if (stored) {
      setCurrentCgpa(Number(stored));
    }
  }, []);

  // Clock Ticker
  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Pomodoro timer Ticker
  useEffect(() => {
    if (!activeTimer) return;
    const pomodoroTimer = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setActiveTimer(false);
          alert("Focus timer completed! Time for a short break.");
          return 1500;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(pomodoroTimer);
  }, [activeTimer]);

  // Next Upcoming Exam & Countdown Calculation
  const getNextExam = () => {
    const todayStr = "2026-06-30"; // Unified local current date string
    const todayTime = new Date(todayStr).getTime();

    // Get sorted uncompleted future exams
    const sortedFuture = [...exams]
      .filter(e => !e.completed && new Date(e.date).getTime() >= todayTime)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return sortedFuture.length > 0 ? sortedFuture[0] : null;
  };

  const nextExam = getNextExam();

  // Custom countdown ticker based on the nextExam date
  const [countdown, setCountdown] = useState({ days: 3, hours: 14, minutes: 22, seconds: 45 });

  useEffect(() => {
    if (!nextExam) return;

    const updateCountdown = () => {
      const examDateTime = new Date(`${nextExam.date} 09:00:00`).getTime();
      const now = new Date().getTime();
      const diff = examDateTime - now;

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextExam]);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  // Get color coding category for exam date
  const getExamColorCode = (exam: Exam) => {
    if (exam.completed) return { bg: "bg-slate-900/40 text-slate-500 border-slate-900", label: "Completed" };
    
    const todayStr = "2026-06-30";
    const examStr = exam.date;

    if (examStr === todayStr) {
      return { bg: "bg-rose-500/10 border-rose-500 text-rose-400 font-bold", label: "Today" };
    }

    // Tomorrow calculation
    const tomorrow = new Date(todayStr);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    if (examStr === tomorrowStr) {
      return { bg: "bg-amber-500/15 border-amber-500/30 text-amber-400 font-semibold", label: "Tomorrow" };
    }

    return { bg: "bg-emerald-500/5 border-emerald-500/20 text-emerald-400", label: "Future" };
  };

  // Save Exam Form
  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examSubject.trim()) return;

    if (editingExamId) {
      setExams(exams.map(ex => ex.id === editingExamId ? {
        ...ex,
        subject: examSubject.trim(),
        date: examDate,
        time: examTime,
        room: examRoom.trim(),
        semester: examSemester,
        examType: examType
      } : ex));
      setEditingExamId(null);
    } else {
      const newEx: Exam = {
        id: Math.random().toString(36).substring(7),
        subject: examSubject.trim(),
        date: examDate,
        time: examTime,
        room: examRoom.trim(),
        semester: examSemester,
        examType: examType,
        completed: false
      };
      setExams([newEx, ...exams]);
    }

    setShowExamModal(false);
    resetExamForm();
  };

  const startEditExam = (ex: Exam) => {
    setEditingExamId(ex.id);
    setExamSubject(ex.subject);
    setExamDate(ex.date);
    setExamTime(ex.time);
    setExamRoom(ex.room || "");
    setExamSemester(ex.semester);
    setExamType(ex.examType);
    setShowExamModal(true);
  };

  const handleDeleteExam = (id: string, name: string) => {
    setDeleteConfirm({ id, name });
  };

  const toggleExamCompleted = (id: string) => {
    setExams(exams.map(ex => ex.id === id ? { ...ex, completed: !ex.completed } : ex));
  };

  const resetExamForm = () => {
    setEditingExamId(null);
    setExamSubject("");
    setExamDate("2026-07-04");
    setExamTime("09:30 AM");
    setExamRoom("");
    setExamSemester("Semester 4");
    setExamType("Final");
  };

  // Simulated AI PDF/Image schedule upload transcribing
  const handleFileUploadMock = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScannedFileName(file.name);
    setImportStatus("scanning");

    // Futuristic simulation timeline
    setTimeout(() => {
      // Create new imported exams
      const imported: Exam[] = [
        {
          id: "ex_imp1",
          subject: "Operating Systems Practical",
          date: "2026-07-03",
          time: "01:30 PM",
          room: "Operating Systems Lab",
          semester: "Semester 4",
          examType: "Practical",
          completed: false
        },
        {
          id: "ex_imp2",
          subject: "Ethics in Computing Seminar",
          date: "2026-07-06",
          time: "10:00 AM",
          room: "Lecture Room C",
          semester: "Semester 4",
          examType: "Quiz",
          completed: false
        }
      ];

      setExams(prev => {
        // Prevent duplicate IDs
        const filtered = prev.filter(p => !p.id.startsWith("ex_imp"));
        return [...imported, ...filtered];
      });

      setImportStatus("done");
    }, 2800);
  };

  // Calculate high level stats
  const totalExamsCount = exams.length;
  const completedExamsCount = exams.filter(e => e.completed).length;
  const remainingExamsCount = totalExamsCount - completedExamsCount;

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden grid-bg">
      {/* Sidebar Navigation */}
      <Sidebar currentScreen="dashboard" onNavigate={onNavigate} />

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10">
        {/* Top Navbar */}
        <header className="p-8 pb-4 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-900/40 gap-4">
          <div>
            <span className="text-[10px] font-bold text-indigo-400 font-mono tracking-widest uppercase">Academic Control Unit</span>
            <h1 className="text-2xl font-black text-white mt-1 font-sans tracking-tight">Good morning, {userName.split(" ")[0]} 👋</h1>
            <p className="text-xs text-slate-400 font-sans mt-0.5">{formattedDate}</p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setImportStatus("idle");
                setShowImportModal(true);
              }}
              className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl px-4 py-2 text-xs font-bold font-sans cursor-pointer transition-colors"
            >
              <UploadCloud className="h-4 w-4 text-indigo-400" />
              <span>Import Schedule</span>
            </button>
            <button
              onClick={() => {
                resetExamForm();
                setShowExamModal(true);
              }}
              className="flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl px-4 py-2 text-xs font-bold font-sans cursor-pointer transition-colors shadow-md shadow-indigo-500/10"
            >
              <Plus className="h-4 w-4" />
              <span>Add Exam</span>
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8 space-y-8">
          
          {welcomeMessage && (
            <div id="google-welcome-toast" className="p-5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/25 rounded-3xl flex items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/25 rounded-2xl shrink-0">
                  <CheckCircle className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white font-sans">{welcomeMessage}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed font-sans">
                    Everything is synchronized and configured for you. Start exploring your workspaces!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWelcomeMessage(null)}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          
          {isWorkspaceEmpty && (
            <div id="empty-workspace-welcome-banner" className="p-6 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-3xl flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
              <div className="p-3.5 bg-indigo-500/15 border border-indigo-500/25 rounded-2xl shrink-0">
                <Sparkles className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white font-sans">Welcome to StudentOS!</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed font-sans">
                  Your workspace is empty. Start by creating your first note, adding a course, or importing your timetable.
                </p>
              </div>
            </div>
          )}

          {/* Bento KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* 1. Attendance Card */}
            <div
              onClick={() => onNavigate("attendance", "push")}
              className="group glass-panel hover:glass-panel-glow border border-slate-900 p-6 rounded-3xl transition-all duration-300 cursor-pointer relative overflow-hidden"
            >
              <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all" />
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">Attendance Ratio</p>
                  <h3 className="text-2xl font-extrabold text-white mt-1 font-mono tracking-tight">
                    {subjectsList.length > 0 ? `${attendancePercent}%` : "No attendance yet"}
                  </h3>
                </div>
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <Calendar className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
              
              <div className="flex items-center space-x-1.5 text-xs text-emerald-400 mt-2">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="font-semibold font-sans">
                  {subjectsList.length > 0 ? "+2.4% from last week" : "Add a subject to track"}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-sans">Click to manage subjects</p>
            </div>

            {/* 2. CGPA Card */}
            <div
              onClick={() => onNavigate("cgpa", "push")}
              className="group glass-panel hover:glass-panel-glow border border-slate-900 p-6 rounded-3xl transition-all duration-300 cursor-pointer relative overflow-hidden"
            >
              <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-all" />

              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">Current Cumulative GPA</p>
                  <h3 className="text-3xl font-extrabold text-white mt-1 font-mono tracking-tight">
                    {currentCgpa > 0 ? currentCgpa.toFixed(2) : "0.00"}
                  </h3>
                </div>
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                  <Award className="h-5 w-5 text-indigo-400" />
                </div>
              </div>

              <div className="w-full bg-slate-900/80 h-1.5 rounded-full mt-2 overflow-hidden border border-slate-800/40">
                <div className="bg-indigo-400 h-full rounded-full transition-all" style={{ width: currentCgpa > 0 ? `${(currentCgpa / 10) * 100}%` : "0%" }} />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 font-mono">
                <span>Scale: 10.0</span>
                <span className="text-indigo-400 font-semibold">{currentCgpa > 0 ? "Top 5% of Batch" : "No grades yet"}</span>
              </div>
            </div>

            {/* 3. Pending Exams / Tasks */}
            <div className="group glass-panel border border-slate-900 p-6 rounded-3xl relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">Exams Registered</p>
                  <h3 className="text-3xl font-extrabold text-white mt-1 font-mono tracking-tight">
                    {exams.length > 0 ? (
                      <>
                        {remainingExamsCount} <span className="text-slate-500 text-sm font-light">/ {totalExamsCount} remaining</span>
                      </>
                    ) : (
                      "No reminders"
                    )}
                  </h3>
                </div>
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <Clock className="h-5 w-5 text-amber-400" />
                </div>
              </div>

              <div className="flex items-center space-x-1.5 text-xs text-amber-400 mt-2">
                <span className="font-semibold font-mono">
                  {exams.length > 0 ? `Completed: ${completedExamsCount} tasks` : "Schedule upcoming reviews"}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-sans">Active study schedules</p>
            </div>

            {/* 4. Focus Streak Card */}
            <div className="group glass-panel border border-slate-900 p-6 rounded-3xl relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">Daily Workstation Streak</p>
                  <h3 className="text-3xl font-extrabold text-white mt-1 font-mono tracking-tight">
                    {isWorkspaceEmpty ? "0 Days" : "7 Days"}
                  </h3>
                </div>
                <div className="p-2.5 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                  <Flame className="h-5 w-5 text-violet-400" />
                </div>
              </div>

              <div className="flex items-center space-x-1.5 text-xs text-violet-400 mt-2">
                <span className="font-semibold font-sans">
                  {isWorkspaceEmpty ? "Start a focus block below!" : "Active study streak maintained!"}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-sans">
                {isWorkspaceEmpty ? "Track your hours dynamically" : "Top 2% of autonomous workstation users"}
              </p>
            </div>

          </div>

          {/* Daily Schedule & Exam Countdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Class Schedule (2/3 columns) */}
            <div className="lg:col-span-2 glass-panel border border-slate-900 p-6 rounded-3xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-sm font-extrabold tracking-wider text-slate-300 uppercase font-mono">Today's Class Schedule</h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-sans">Live tracking and attendance checklist</p>
                </div>
                <button
                  onClick={() => onNavigate("attendance", "none")}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all flex items-center space-x-1 text-xs font-semibold font-sans cursor-pointer"
                >
                  <span>Attendance Manager</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3.5">
                {(() => {
                  const schedule = timetableList;
                  if (!schedule || schedule.length === 0) {
                    return <EmptyState onAddClick={() => onNavigate("attendance", "none")} />;
                  }

                  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                  const todayDayName = weekdays[currentTime.getDay()];
                  const todaysClasses = schedule.filter(item => item.day === todayDayName);

                  return todaysClasses.length > 0 ? (
                    todaysClasses.map((cls, idx) => {
                      const subject = subjectsList.find(s => s.id === cls.subjectId);
                      const subName = subject ? subject.name : cls.subjectId || "Study Class";
                      return (
                        <div
                          key={cls.id || idx}
                          className="flex items-center justify-between p-4 border border-indigo-500/20 bg-slate-900/20 rounded-2xl"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="h-2 w-2 rounded-full bg-indigo-400" />
                            <div>
                              <p className="text-xs font-extrabold text-white font-sans">{subName}</p>
                              <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono mt-0.5">
                                <span>{cls.time}</span>
                                <span>•</span>
                                <span>{cls.room || "No Room Specified"}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <span className="text-[9px] font-extrabold font-mono uppercase px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800">
                              Scheduled
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 bg-slate-900/10 border border-slate-850 rounded-2xl text-center text-xs text-slate-500 font-sans">
                      No classes scheduled for today ({todayDayName}). Enjoy your study break!
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* UPGRADED Exam countdown module (1/3 column) */}
            <div className="glass-panel border border-slate-900 p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-extrabold tracking-wider text-slate-300 uppercase font-mono mb-4">Exam Countdown</h2>
                
                {nextExam ? (
                  <div className="p-4 bg-slate-900/30 border border-indigo-500/20 rounded-2xl text-center mb-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 bg-indigo-500 text-[8px] font-extrabold font-mono px-2 py-0.5 uppercase tracking-wider rounded-br-lg text-white">
                      {nextExam.subject}
                    </div>
                    
                    <div className="grid grid-cols-4 gap-1.5 mt-4">
                      {[
                        { val: countdown.days, label: "Days" },
                        { val: countdown.hours, label: "Hours" },
                        { val: countdown.minutes, label: "Mins" },
                        { val: countdown.seconds, label: "Secs" }
                      ].map((timeVal, index) => (
                        <div key={index} className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
                          <span className="block text-lg font-black font-mono text-indigo-400 leading-none">{timeVal.val < 10 ? `0${timeVal.val}` : timeVal.val}</span>
                          <span className="text-[8px] uppercase font-bold text-slate-400 mt-1 block">{timeVal.label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-[9px] text-slate-400 mt-3 font-mono">
                      Target session: {nextExam.date} @ {nextExam.time} ({nextExam.room})
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-2xl text-center mb-4 text-xs text-slate-500 font-sans">
                    No future exams found. You are fully revision-complete!
                  </div>
                )}

                {/* Compact sub list of upcoming exams */}
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {exams.map(ex => {
                    const statusConfig = getExamColorCode(ex);
                    return (
                      <div 
                        key={ex.id} 
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                          ex.completed ? "opacity-60 bg-slate-950/20 border-slate-950" : "bg-slate-900/20 border-slate-900"
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <button
                            onClick={() => toggleExamCompleted(ex.id)}
                            className="shrink-0 cursor-pointer"
                            title="Toggle status"
                          >
                            <input
                              type="checkbox"
                              checked={ex.completed}
                              readOnly
                              className="accent-indigo-500 h-3 w-3 cursor-pointer"
                            />
                          </button>
                          <div className="min-w-0">
                            <span className={`font-semibold font-sans block truncate ${ex.completed ? "line-through text-slate-500" : "text-slate-200"}`}>{ex.subject}</span>
                            <span className="text-[8px] font-mono text-slate-500 block">{ex.date} • {ex.examType}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 ml-2">
                          <span className={`px-1.5 py-0.2 rounded text-[7px] font-bold font-mono tracking-wider uppercase ${statusConfig.bg}`}>
                            {statusConfig.label}
                          </span>
                          <button
                            onClick={() => startEditExam(ex)}
                            className="p-1 hover:bg-slate-900 text-slate-500 hover:text-white rounded"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteExam(ex.id, ex.subject)}
                            className="p-1 hover:bg-rose-500/10 text-slate-500 hover:text-red-400 rounded"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-900 mt-4 flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-mono">Exam Prep Ratio:</span>
                <span className="text-xs font-extrabold font-mono text-indigo-300">
                  {totalExamsCount > 0 ? Math.round((completedExamsCount / totalExamsCount) * 100) : 0}%
                </span>
              </div>
            </div>

          </div>

          {/* Study Notes & Assignments Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Study Notes List */}
            <div className="glass-panel border border-slate-900 p-6 rounded-3xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-sm font-extrabold tracking-wider text-slate-300 uppercase font-mono">Subject Notes & Files</h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-sans">Uploaded study materials & files</p>
                </div>
                <button
                  onClick={() => onNavigate("subject_notes", "none")}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all flex items-center space-x-1 text-xs font-semibold font-sans cursor-pointer"
                >
                  <span>Subject Notes</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {notesList.length > 0 ? (
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {notesList.slice(0, 3).map((note: any) => (
                    <div
                      key={note.id}
                      onClick={() => onNavigate("subject_notes", "none")}
                      className="p-4 bg-slate-900/30 border border-slate-900 rounded-2xl flex items-center justify-between hover:border-slate-800 transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                          <FileText className="h-4 w-4 text-indigo-400" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-white block font-sans">{note.title}</span>
                          <span className="text-[10px] font-mono text-slate-500 block mt-0.5">{note.category} • {note.updatedAt}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-600" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl text-center py-10 flex flex-col items-center justify-center">
                  <FileText className="h-8 w-8 text-slate-600 mb-2" />
                  <span className="text-xs font-bold text-slate-400 font-sans block">No documents uploaded</span>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-xs leading-relaxed font-sans">
                    Upload documents or study notes to your subject folders in Subject Notes.
                  </p>
                </div>
              )}
            </div>

            {/* Assignments & Goals List */}
            <div className="glass-panel border border-slate-900 p-6 rounded-3xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-sm font-extrabold tracking-wider text-slate-300 uppercase font-mono">Tasks & Assignments</h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-sans">Weekly planner and action items</p>
                </div>
                <button
                  onClick={() => onNavigate("daily_planner", "none")}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all flex items-center space-x-1 text-xs font-semibold font-sans cursor-pointer"
                >
                  <span>Open Planner</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {tasksList.length > 0 ? (
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {tasksList.slice(0, 3).map((task: any) => (
                    <div
                      key={task.id}
                      className="p-4 bg-slate-900/30 border border-slate-900 rounded-2xl flex items-center justify-between hover:border-slate-800 transition-all"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className={`p-1.5 rounded-lg border ${task.completed ? "bg-slate-900 border-slate-850" : "bg-emerald-500/10 border-emerald-500/20"}`}>
                          <CheckCircle className={`h-4 w-4 ${task.completed ? "text-slate-500" : "text-emerald-400"}`} />
                        </div>
                        <div>
                          <span className={`text-xs font-extrabold block font-sans ${task.completed ? "line-through text-slate-500" : "text-white"}`}>{task.text}</span>
                          <span className="text-[10px] font-mono text-slate-500 block mt-0.5">Priority: {task.priority || "Normal"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl text-center py-10 flex flex-col items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-slate-600 mb-2" />
                  <span className="text-xs font-bold text-slate-400 font-sans block">No assignments yet</span>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-xs leading-relaxed font-sans">
                    Plan your weekly tasks or track assignments inside the Daily Planner.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions & Pomodoro Core Widget */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Quick action grid (2/3 columns) */}
            <div className="lg:col-span-2 glass-panel border border-slate-900 p-6 rounded-3xl">
              <h2 className="text-sm font-extrabold tracking-wider text-slate-300 uppercase font-mono mb-4">Quick Workstation Actions</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                
                {/* 1. Subject Notes */}
                <div
                  onClick={() => onNavigate("subject_notes", "none")}
                  className="group bg-slate-900/30 hover:bg-indigo-500/5 border border-slate-900 hover:border-indigo-500/20 p-4 rounded-2xl transition-all cursor-pointer flex flex-col justify-between min-h-[110px]"
                >
                  <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/10 w-fit group-hover:scale-105 transition-transform">
                    <Files className="h-4.5 w-4.5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-white font-sans group-hover:text-indigo-300 transition-colors">Subject Notes</h3>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-sans">Manage study files</p>
                  </div>
                </div>

                {/* 2. CGPA Tracker Action */}
                <div
                  onClick={() => onNavigate("cgpa", "push")}
                  className="group bg-slate-900/30 hover:bg-indigo-500/5 border border-slate-900 hover:border-indigo-500/20 p-4 rounded-2xl transition-all cursor-pointer flex flex-col justify-between min-h-[110px]"
                >
                  <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/10 w-fit group-hover:scale-105 transition-transform">
                    <Award className="h-4.5 w-4.5 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-white font-sans group-hover:text-violet-300 transition-colors">GPA Tracker</h3>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-sans">Calculate target grades</p>
                  </div>
                </div>

                {/* 3. Daily Planner */}
                <div
                  onClick={() => onNavigate("daily_planner", "none")}
                  className="group bg-slate-900/30 hover:bg-indigo-500/5 border border-slate-900 hover:border-indigo-500/20 p-4 rounded-2xl transition-all cursor-pointer flex flex-col justify-between min-h-[110px]"
                >
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/10 w-fit group-hover:scale-105 transition-transform">
                    <Calendar className="h-4.5 w-4.5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-white font-sans group-hover:text-emerald-300 transition-colors">Productivity</h3>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-sans">Open Habit Planner</p>
                  </div>
                </div>

                {/* 4. Ask AI */}
                <div
                  onClick={() => onNavigate("ai_study", "none")}
                  className="group bg-slate-900/30 hover:bg-indigo-500/5 border border-slate-900 hover:border-indigo-500/20 p-4 rounded-2xl transition-all cursor-pointer flex flex-col justify-between min-h-[110px]"
                >
                  <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/10 w-fit group-hover:scale-105 transition-transform">
                    <Bot className="h-4.5 w-4.5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-white font-sans group-hover:text-indigo-300 transition-colors">Ask AI</h3>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-sans">Open smart workspace</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Pomodoro Timer widget */}
            <div className="glass-panel border border-slate-900 p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-extrabold tracking-wider text-slate-300 uppercase font-mono">Pomodoro Focus Timer</h2>
                  <span className="text-[9px] font-mono bg-violet-500/20 border border-violet-500/20 px-2 py-0.5 rounded text-violet-300">Active Block</span>
                </div>

                <div className="text-center p-4">
                  <div className="text-4xl font-extrabold font-mono text-white tracking-tight">{formatTime(timerSeconds)}</div>
                  <p className="text-[10px] text-slate-400 mt-1 font-sans">Standard 25 minute study interval</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTimer(!activeTimer)}
                  className={`flex-1 font-sans text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer transition-all ${
                    activeTimer
                      ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/50"
                      : "bg-indigo-500 hover:bg-indigo-600 text-white shadow-md shadow-indigo-500/15"
                  }`}
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>{activeTimer ? "Pause Session" : "Start Focus"}</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTimer(false);
                    setTimerSeconds(1500);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer font-sans text-xs font-bold"
                >
                  Reset
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Modal: Add/Edit Exam */}
        {showExamModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-md bg-slate-950 border border-slate-900 p-6 rounded-3xl space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-extrabold text-white tracking-tight font-sans">
                  {editingExamId ? "Modify Exam details" : "Schedule New Exam"}
                </h3>
                <button
                  onClick={() => setShowExamModal(false)}
                  className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveExam} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Subject / Module Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Theory of Computation"
                    value={examSubject}
                    onChange={(e) => setExamSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Exam Date</label>
                    <input
                      type="date"
                      required
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500/50 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Time</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 09:30 AM"
                      value={examTime}
                      onChange={(e) => setExamTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500/50 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Room / Lab (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Hall 4"
                      value={examRoom}
                      onChange={(e) => setExamRoom(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500/50 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Exam Category</label>
                    <select
                      value={examType}
                      onChange={(e) => setExamType(e.target.value as Exam["examType"])}
                      className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-300 font-sans rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                    >
                      <option value="Final">Final Exam</option>
                      <option value="Midterm">Midterm Exam</option>
                      <option value="Quiz">Quick Quiz</option>
                      <option value="Practical">Practical / Lab</option>
                      <option value="Other">Other Assessment</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Academic Semester</label>
                  <input
                    type="text"
                    required
                    value={examSemester}
                    onChange={(e) => setExamSemester(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500/50 text-xs"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowExamModal(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md shadow-indigo-500/10"
                  >
                    Save Exam Schedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Gemini Smart Import PDF/Image Exam Schedule */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-md bg-slate-950 border border-slate-900 p-6 rounded-3xl space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-1.5 text-indigo-400">
                  <Bot className="h-5 w-5" />
                  <h3 className="text-base font-extrabold text-white tracking-tight font-sans">Gemini OCR Schedule Import</h3>
                </div>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {importStatus === "idle" && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    Drop your official university exam timetable PDF or image. Google Gemini will parse the text and map subjects, times, and exam formats automatically!
                  </p>

                  <div className="p-8 border-2 border-dashed border-slate-850 hover:border-indigo-500/40 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer relative transition-all bg-slate-900/10 hover:bg-indigo-500/5">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileUploadMock}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <UploadCloud className="h-10 w-10 text-indigo-400 mb-2.5" />
                    <span className="text-xs font-extrabold text-slate-200 block font-sans">Click or Drag & Drop File</span>
                    <span className="text-[10px] text-slate-500 mt-1 font-mono">Supports PDF, PNG, JPG (Max 10MB)</span>
                  </div>
                </div>
              )}

              {importStatus === "scanning" && (
                <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="relative flex items-center justify-center">
                    <div className="w-14 h-14 border-2 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin" />
                    <Bot className="absolute h-6 w-6 text-indigo-400 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-white font-sans block">Analyzing {scannedFileName}</span>
                    <span className="text-[10px] text-indigo-400 font-mono mt-1 block">Performing Gemini Vision transcription OCR...</span>
                  </div>
                  
                  {/* Fake scanner scanning animation bar */}
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-850">
                    <div className="bg-indigo-500 h-full rounded-full animate-pulse w-3/4" />
                  </div>
                </div>
              )}

              {importStatus === "done" && (
                <div className="space-y-4 text-center py-2">
                  <div className="mx-auto p-2 bg-emerald-500/15 border border-emerald-500/30 rounded-full w-fit">
                    <CheckCircle className="h-8 w-8 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-white font-sans block">Transcription Complete!</span>
                    <p className="text-[11px] text-slate-400 leading-normal font-sans mt-1">
                      Gemini detected and parsed <span className="font-bold text-indigo-400">2 new exam routines</span> inside {scannedFileName}. Mapped with matching modules!
                    </p>
                  </div>

                  {/* List of parsed schedules */}
                  <div className="space-y-2 text-left bg-slate-950/60 p-3 rounded-2xl border border-slate-900 text-xs">
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 border-b border-slate-900 pb-1.5 mb-1.5">
                      <span>Subject Mapped</span>
                      <span>Target Date</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-200">Operating Systems Prac</span>
                      <span className="font-mono text-emerald-400">2026-07-03</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-200">Ethics in Computing Quiz</span>
                      <span className="font-mono text-emerald-400">2026-07-06</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowImportModal(false)}
                    className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold font-sans cursor-pointer transition-colors"
                  >
                    Close & View Schedules
                  </button>
                </div>
              )}

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
                <h3 className="text-sm font-bold text-white font-sans font-extrabold">Delete Exam Entry</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Are you sure you want to remove <span className="text-white font-semibold">{deleteConfirm.name}</span> from your exam schedule?
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
                    setExams(exams.filter(ex => ex.id !== deleteConfirm.id));
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
