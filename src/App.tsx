import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Cloud, CloudLightning, RefreshCw, CheckCircle2, Database, Copy, Check, ExternalLink, AlertTriangle, X } from "lucide-react";
import { supabase, onAuthStateChanged, syncGoogleUserProfile } from "./lib/supabaseService";
import { pullFirestoreToLocalState, pushLocalStateToFirestore, getLocalStorageSnapshotHash, initializeEmptyWorkspace } from "./lib/syncEngine";
import {
  ScreenID,
  SubjectAttendance,
  CourseGrade,
  ChatSession
} from "./types";

// Import Modular screens
import LoginScreen from "./components/LoginScreen";
import SignUpScreen from "./components/SignUpScreen";
import PhoneEntryScreen from "./components/PhoneEntryScreen";
import ForgotPasswordScreen from "./components/ForgotPasswordScreen";
import ResetPasswordScreen from "./components/ResetPasswordScreen";
import DashboardScreen from "./components/DashboardScreen";
import AttendanceScreen from "./components/AttendanceScreen";
import CgpaScreen from "./components/CgpaScreen";
import AiStudyScreen from "./components/AiStudyScreen";
import SubjectNotesScreen from "./components/SubjectNotesScreen";
import DailyPlannerScreen from "./components/DailyPlannerScreen";

// Initial populated mock data for full interactive high-fidelity out of the box
const initialAttendance: SubjectAttendance[] = [
];

const initialCourses: CourseGrade[] = [
];

const initialSessions: ChatSession[] = [
  {
    id: "s1",
    title: "AI Study Assistant",
    messages: [
      {
        id: "m1",
        role: "model",
        text: "Hello! I'm your StudentOS AI tutor. How can I help you accelerate your academic goals today? 🚀",
        timestamp: "09:30 AM"
      }
    ]
  }
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenID>("login");
  const [transitionDir, setTransitionDir] = useState<"none" | "push" | "push_back">("none");
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem("studentos_user_name") || "Tanu";
  });

  const handleSetUserName = (name: string) => {
    setUserName(name);
    localStorage.setItem("studentos_user_name", name);
  };

  // Shared application states initialized dynamically with fallback
  const [subjects, setSubjects] = useState<SubjectAttendance[]>(() => {
    const activeUid = localStorage.getItem("studentos_active_uid");
    const isLoggedIn = activeUid && activeUid !== "guest";
    const stored = localStorage.getItem("studentos_subjects");
    if (stored) {
      return JSON.parse(stored);
    }
    return isLoggedIn ? [] : initialAttendance;
  });
  const [courses, setCourses] = useState<CourseGrade[]>(() => {
    const activeUid = localStorage.getItem("studentos_active_uid");
    const isLoggedIn = activeUid && activeUid !== "guest";
    return isLoggedIn ? [] : initialCourses;
  });
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions);

  // Sync state tracking
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<"offline" | "syncing" | "synced" | "error">("offline");
  const [syncTrigger, setSyncTrigger] = useState(0);
  const [showTablesModal, setShowTablesModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleTablesMissing = () => {
      if (localStorage.getItem("supabase_tables_modal_dismissed") !== "true") {
        setShowTablesModal(true);
      }
    };
    window.addEventListener("supabase_tables_missing", handleTablesMissing);
    if (localStorage.getItem("supabase_tables_missing") === "true" && localStorage.getItem("supabase_tables_modal_dismissed") !== "true") {
      setShowTablesModal(true);
    }
    return () => {
      window.removeEventListener("supabase_tables_missing", handleTablesMissing);
    };
  }, []);

  // Hash & Event based Password Recovery Route Listener
  useEffect(() => {
    const checkRecovery = () => {
      const hash = window.location.hash || "";
      if (hash.includes("type=recovery") || hash.includes("access_token=") || hash.includes("recovery")) {
        setCurrentScreen("reset_password");
      }
    };
    
    // Check on load
    checkRecovery();
    
    // Listen for manual hash changes
    window.addEventListener("hashchange", checkRecovery);

    // Also listen directly to Supabase recovery events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setCurrentScreen("reset_password");
      }
    });

    return () => {
      window.removeEventListener("hashchange", checkRecovery);
      subscription.unsubscribe();
    };
  }, []);

  // Auto-save state updates to local storage for instant sync triggering
  useEffect(() => {
    localStorage.setItem("studentos_subjects", JSON.stringify(subjects));
  }, [subjects]);

  // Auth & Cloud Pull effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(supabase, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        const isLocalUser = String(user.id || user.uid || "").startsWith("local_");
        if (isLocalUser) {
          setSyncStatus("offline");
          let name = localStorage.getItem("studentos_user_name") || user.user_metadata?.full_name || "Tanusree";
          if (name) setUserName(name);
          
          const subs = localStorage.getItem("studentos_subjects");
          setSubjects(subs ? JSON.parse(subs) : initialAttendance);
          
          setCurrentScreen((prevScreen) => {
            if (prevScreen === "login" || prevScreen === "signin" || prevScreen === "signup" || prevScreen === "phone_entry") {
              return "dashboard";
            }
            return prevScreen;
          });
          return;
        }

        setSyncStatus("syncing");
        
        const lastUid = localStorage.getItem("studentos_active_uid");
        const currentUid = user.id || user.uid;

        if (lastUid !== currentUid) {
          // Fresh login transition or user switch - clear guest/previous user mock data
          const currentLocalName = localStorage.getItem("studentos_user_name") || user.user_metadata?.full_name || "Tanusree";
          initializeEmptyWorkspace(currentLocalName);
          localStorage.setItem("studentos_active_uid", currentUid);
          
          // Reset React states to empty immediately to reflect the new login
          setSubjects([]);
          setCourses([]);
          setUserName(currentLocalName);
        }

        try {
          // If logged in via Google, sync profile data in Supabase (UID, Name, Email, photo, lastLogin)
          const isGoogleUser = user.app_metadata?.provider === "google" || user.identities?.[0]?.provider === "google" || !!user.user_metadata?.avatar_url;
          let hadCloudData = false;
          
          if (isGoogleUser) {
            const isNewGoogleUser = await syncGoogleUserProfile(user);
            if (isNewGoogleUser) {
              const currentLocalName = user.user_metadata?.full_name || "Tanusree";
              localStorage.setItem("studentos_welcome_msg", `Welcome, ${currentLocalName}! Your StudentOS account is ready.`);
              initializeEmptyWorkspace(currentLocalName);
              await pushLocalStateToFirestore(user.id || user.uid);
              hadCloudData = true;
            } else {
              hadCloudData = await pullFirestoreToLocalState(user.id || user.uid);
            }
          } else {
            hadCloudData = await pullFirestoreToLocalState(user.id || user.uid);
            if (!hadCloudData) {
              // First time login - initialize their workspace to be completely empty
              const currentLocalName = localStorage.getItem("studentos_user_name") || user.user_metadata?.full_name || "Tanusree";
              initializeEmptyWorkspace(currentLocalName);
              await pushLocalStateToFirestore(user.id || user.uid);
            }
          }
          
          // Refresh React states with cloud-resolved values
          let name = localStorage.getItem("studentos_user_name");
          if (!name && user.user_metadata?.full_name) {
            name = user.user_metadata.full_name;
            localStorage.setItem("studentos_user_name", name);
          } else if (!name && user.email) {
            const localPart = user.email.split("@")[0] || "Tanu";
            name = localPart.charAt(0).toUpperCase() + localPart.slice(1);
            localStorage.setItem("studentos_user_name", name);
          }
          if (name) setUserName(name);

          const subs = localStorage.getItem("studentos_subjects");
          setSubjects(subs ? JSON.parse(subs) : []);

          setSyncStatus("synced");
          setSyncTrigger((prev) => prev + 1);

          // Automatically transition the active screen to dashboard if they are on auth/login screens
          setCurrentScreen((prevScreen) => {
            const isRecovery = window.location.hash.includes("recovery") || window.location.hash.includes("type=recovery") || prevScreen === "reset_password";
            if (isRecovery) {
              return "reset_password";
            }
            if (prevScreen === "login" || prevScreen === "signin" || prevScreen === "signup" || prevScreen === "phone_entry") {
              return "dashboard";
            }
            return prevScreen;
          });
        } catch (e) {
          console.error("Error syncing during auth change:", e);
          setSyncStatus("error");
        }
      } else {
        setCurrentUser(null);
        setSyncStatus("offline");

        // Clear user data in localStorage on logout to prevent leakage and dirty caches
        localStorage.setItem("studentos_user_name", "Tanu");
        localStorage.setItem("studentos_subjects", JSON.stringify(initialAttendance));
        localStorage.setItem("studentos_weekly_tasks", JSON.stringify([]));
        localStorage.setItem("studentos_planner_goals", JSON.stringify([]));
        localStorage.setItem("studentos_habits", JSON.stringify([]));
        localStorage.setItem("studentos_mood_logs", JSON.stringify([]));
        localStorage.setItem("studentos_journals", JSON.stringify([]));
        localStorage.setItem("studentos_semesters", JSON.stringify([]));
        localStorage.setItem("studentos_exams", JSON.stringify([]));
        localStorage.setItem("studentos_cumulative_cgpa", "8.72");
        localStorage.setItem("studentos_subject_folders", JSON.stringify([]));
        localStorage.setItem("studentos_subject_files", JSON.stringify([]));
        localStorage.setItem("studentos_note_categories", JSON.stringify([]));
        localStorage.removeItem("studentos_google_user");
        localStorage.removeItem("supabase_tables_modal_dismissed");
        localStorage.setItem("studentos_active_uid", "guest");

        // Reset App.tsx React states to clean defaults
        setSubjects(initialAttendance);
        setCourses(initialCourses);
        setSessions(initialSessions);
        setUserName("Tanu");
        setSyncTrigger((prev) => prev + 1);
      }
    });
    return () => unsubscribe();
  }, []);

  // Periodic watch-and-push syncing loop
  useEffect(() => {
    if (!currentUser || String(currentUser.id || currentUser.uid || "").startsWith("local_")) return;
    if (syncStatus !== "synced") return; // DO NOT PUSH if not fully loaded/synced

    let lastHash = getLocalStorageSnapshotHash();

    const interval = setInterval(async () => {
      const currentHash = getLocalStorageSnapshotHash();
      if (currentHash !== lastHash) {
        setSyncStatus("syncing");
        try {
          await pushLocalStateToFirestore(currentUser.id || currentUser.uid);
          lastHash = currentHash;
          setSyncStatus("synced");
        } catch (e) {
          console.error("Cloud push error:", e);
          setSyncStatus("error");
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentUser, syncStatus]);

  // Dynamically calculate overall attendance ratio
  const calculateOverallAttendance = () => {
    let totalClasses = 0;
    let attendedClasses = 0;

    subjects.forEach((sub) => {
      const subTotal = sub.present + sub.absent + sub.late;
      totalClasses += subTotal;
      attendedClasses += sub.present + sub.late; // Late counts as present
    });

    if (totalClasses === 0) return 0;
    return Math.round((attendedClasses / totalClasses) * 100);
  };

  const attendancePercent = calculateOverallAttendance();

  // Dynamically calculate simulated Cumulative CGPA
  const calculateOverallCgpa = () => {
    let totalCredits = 0;
    let totalPoints = 0;

    courses.forEach((c) => {
      totalCredits += c.credits;
      totalPoints += c.credits * c.points;
    });

    const activeUid = localStorage.getItem("studentos_active_uid");
    const isLoggedIn = activeUid && activeUid !== "guest";

    if (totalCredits === 0) {
      return isLoggedIn ? 0 : 8.72; // pre-populated base for guests, clean 0 for real users
    }
    
    if (isLoggedIn) {
      return Math.round((totalPoints / totalCredits) * 100) / 100;
    }

    // Weighted GPA simulation. We scale it so it's around the requested 8.72 base
    const currentSemGPA = totalPoints / totalCredits;
    
    // Historical base: 60 credits at 8.70 GPA. Adding active semester
    const historicalCredits = 60;
    const historicalPoints = 60 * 8.70;

    const cumulativePoints = historicalPoints + totalPoints;
    const cumulativeCredits = historicalCredits + totalCredits;

    return Math.round((cumulativePoints / cumulativeCredits) * 100) / 100;
  };

  const cgpaVal = calculateOverallCgpa();

  // Navigate function matching navigation specifications
  const handleNavigate = (screen: ScreenID, direction: "none" | "push" | "push_back" = "none") => {
    setTransitionDir(direction);
    setCurrentScreen(screen);
  };

  // Render correct screen component
  const renderScreen = () => {
    switch (currentScreen) {
      case "login":
      case "signin":
        return <LoginScreen onNavigate={handleNavigate} setUserName={handleSetUserName} />;
      case "signup":
        return <SignUpScreen onNavigate={handleNavigate} setUserName={handleSetUserName} />;
      case "forgot_password":
        return <ForgotPasswordScreen onNavigate={handleNavigate} />;
      case "reset_password":
        return <ResetPasswordScreen onNavigate={handleNavigate} />;
      case "phone_entry":
        return <PhoneEntryScreen onNavigate={handleNavigate} />;
      case "dashboard":
        return (
          <DashboardScreen
            onNavigate={handleNavigate}
            attendancePercent={attendancePercent}
            cgpaVal={cgpaVal}
            userName={userName}
            syncTrigger={syncTrigger}
          />
        );
      case "attendance":
        return (
          <AttendanceScreen
            onNavigate={handleNavigate}
            subjects={subjects}
            setSubjects={setSubjects}
            overallPercent={attendancePercent}
          />
        );
      case "cgpa":
        return (
          <CgpaScreen
            onNavigate={handleNavigate}
          />
        );
      case "subject_notes":
        return (
          <SubjectNotesScreen
            onNavigate={handleNavigate}
          />
        );
      case "daily_planner":
        return (
          <DailyPlannerScreen
            onNavigate={handleNavigate}
          />
        );
      case "ai_study":
        return (
          <AiStudyScreen
            onNavigate={handleNavigate}
            sessions={sessions}
            setSessions={setSessions}
          />
        );
      default:
        return <LoginScreen onNavigate={handleNavigate} />;
    }
  };

  // Sliding dynamic framer-motion variants
  const pageVariants = {
    initial: (dir: "none" | "push" | "push_back") => {
      if (dir === "none") return { opacity: 0 };
      return {
        x: dir === "push" ? "100%" : "-100%",
        opacity: 0
      };
    },
    animate: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.35, ease: "easeInOut" }
    },
    exit: (dir: "none" | "push" | "push_back") => {
      if (dir === "none") return { opacity: 0 };
      return {
        x: dir === "push" ? "-100%" : "100%",
        opacity: 0,
        transition: { duration: 0.35, ease: "easeInOut" }
      };
    }
  };

  const sqlSnippet = `-- Create students table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    department TEXT DEFAULT 'Computer Science & Engineering',
    semester INTEGER DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_sync table to persist multi-module state
CREATE TABLE IF NOT EXISTS public.user_sync (
    uid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    collection_name TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (uid, collection_name)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sync ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid duplicates
DROP POLICY IF EXISTS "Allow individual read/write students" ON public.students;
DROP POLICY IF EXISTS "Allow individual read/write user_sync" ON public.user_sync;

-- Create policies
CREATE POLICY "Allow individual read/write students" ON public.students
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Allow individual read/write user_sync" ON public.user_sync
    FOR ALL USING (auth.uid() = uid);`;

  const copyToClipboard = (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text);
        return true;
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      }
    } catch (err) {
      console.error("Copy failed", err);
      return false;
    }
  };

  const renderSyncBadge = () => {
    if (currentScreen === "login" || currentScreen === "signin" || currentScreen === "signup") {
      return null;
    }

    const isMissing = localStorage.getItem("supabase_tables_missing") === "true";

    return (
      <div 
        onClick={() => {
          if (syncStatus === "error" || isMissing) {
            setShowTablesModal(true);
          }
        }}
        title={(syncStatus === "error" || isMissing) ? "Database setup needed! Click to view SQL script" : "Cloud Sync Status"}
        className={`fixed top-4 right-4 z-50 flex items-center space-x-1.5 bg-slate-900/85 backdrop-blur-md border px-3 py-1.5 rounded-full text-[10px] font-mono shadow-lg transition-all text-white cursor-pointer hover:bg-slate-800 ${
          (syncStatus === "error" || isMissing) ? "border-rose-500/50 ring-2 ring-rose-500/20" : "border-slate-800/80"
        }`}
      >
        {syncStatus === "synced" && !isMissing && (
          <>
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            <span className="text-slate-300">Cloud Synced</span>
          </>
        )}
        {syncStatus === "syncing" && !isMissing && (
          <>
            <RefreshCw className="h-3 w-3 text-blue-400 animate-spin" />
            <span className="text-slate-300">Saving...</span>
          </>
        )}
        {(syncStatus === "error" || isMissing) && (
          <>
            <CloudLightning className="h-3 w-3 text-rose-400 animate-pulse" />
            <span className="text-rose-400 font-bold hover:underline">Setup DB</span>
          </>
        )}
        {syncStatus === "offline" && !isMissing && (
          <>
            <Cloud className="h-3 w-3 text-slate-500" />
            <span className="text-slate-400">Offline</span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-950 min-h-screen text-white relative overflow-hidden select-none">
      {renderSyncBadge()}
      <AnimatePresence initial={false} mode="wait" custom={transitionDir}>
        <motion.div
          key={currentScreen}
          custom={transitionDir}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full h-screen"
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>

      {showTablesModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-left relative my-8"
          >
            <button 
              onClick={() => {
                localStorage.setItem("supabase_tables_modal_dismissed", "true");
                setShowTablesModal(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Supabase Database Setup Required
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  We detected that the required tables (<code className="text-amber-400">students</code> and <code className="text-amber-400">user_sync</code>) have not been created in your Supabase project. To enable secure real-time cloud backups, please apply this schema.
                </p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-850 text-xs text-slate-300">
              <p className="font-bold text-slate-200">How to fix this in 3 easy steps:</p>
              <ol className="list-decimal list-inside space-y-2 text-slate-400 text-[11px]">
                <li>Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-indigo-400 font-semibold underline inline-flex items-center gap-0.5 hover:text-indigo-300">Supabase Dashboard <ExternalLink className="h-2.5 w-2.5" /></a> and open your project.</li>
                <li>Navigate to the <strong className="text-slate-300">SQL Editor</strong> in the left sidebar and click <strong className="text-slate-300">New Query</strong>.</li>
                <li>Paste the SQL script below and click the <strong className="text-indigo-400">Run</strong> button in the bottom right.</li>
              </ol>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500">Database Schema Script (SQL)</span>
                <button
                  onClick={() => {
                    const ok = copyToClipboard(sqlSnippet);
                    if (ok) {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy SQL Script</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 max-h-56 overflow-y-auto font-mono text-[10.5px] text-slate-300 selection:bg-indigo-500/30">
                <pre>{sqlSnippet}</pre>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span>✓</span> App falls back safely to local storage while pending
              </p>
              <button
                onClick={async () => {
                  localStorage.setItem("supabase_tables_modal_dismissed", "true");
                  localStorage.removeItem("supabase_tables_missing");
                  setShowTablesModal(false);
                  if (currentUser) {
                    setSyncStatus("syncing");
                    try {
                      await pushLocalStateToFirestore(currentUser.id || currentUser.uid);
                      setSyncStatus("synced");
                    } catch (err) {
                      console.warn("Sync failed after setup:", err);
                      setSyncStatus("error");
                    }
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-md"
              >
                Done / I have run this script
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
