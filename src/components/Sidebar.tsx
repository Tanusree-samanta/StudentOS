import React from "react";
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Bot,
  Award,
  Files,
  ListTodo,
  LogOut,
  GraduationCap
} from "lucide-react";
import { ScreenID } from "../types";
import { supabase, signOutUser } from "../lib/supabaseService";
import { pushLocalStateToFirestore } from "../lib/syncEngine";

interface SidebarProps {
  currentScreen: ScreenID;
  onNavigate: (screen: ScreenID, direction: "none" | "push" | "push_back") => void;
}

export default function Sidebar({ currentScreen, onNavigate }: SidebarProps) {
  const menuItems = [
    {
      id: "dashboard" as ScreenID,
      label: "Dashboard",
      icon: LayoutDashboard,
      xpathLabel: "Dashboard"
    },
    {
      id: "attendance" as ScreenID,
      label: "Class Schedule", // Matching xpath //span[contains(text(), 'Class Schedule')]/..
      icon: Calendar,
      xpathLabel: "Class Schedule"
    },
    {
      id: "subject_notes" as ScreenID,
      label: "Subject Notes",
      icon: Files,
      xpathLabel: "Subject Notes"
    },
    {
      id: "daily_planner" as ScreenID,
      label: "Daily Planner",
      icon: ListTodo,
      xpathLabel: "Daily Planner"
    },
    {
      id: "ai_study" as ScreenID,
      label: "AI Workspace", // Matching xpath //span[contains(text(), 'AI Workspace')]/..
      icon: Bot,
      xpathLabel: "AI Workspace"
    },
    {
      id: "cgpa" as ScreenID,
      label: "CGPA Calculator",
      icon: Award,
      xpathLabel: "CGPA Calculator"
    }
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-900/80 flex flex-col h-screen shrink-0 relative z-25">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-slate-900/60 flex items-center space-x-3">
        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <GraduationCap className="h-6 w-6 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-white tracking-tight font-sans">
            Student<span className="text-indigo-400">OS</span>
          </h2>
          <span className="text-[10px] font-bold font-mono tracking-wider text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase">AI CORE v3</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold text-slate-500 tracking-wider uppercase px-3 mb-2 font-mono">Academic Workspace</div>
        
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = currentScreen === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id, "none")}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer font-sans text-xs font-semibold tracking-wide ${
                isActive
                  ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-[0_0_12px_rgba(99,102,241,0.05)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent"
              }`}
            >
              <IconComponent className={`h-4.5 w-4.5 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
              <span className="text-left">{item.xpathLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* Dynamic Profile Block */}
      <div className="p-4 border-t border-slate-900/80 bg-slate-950/80 backdrop-blur-sm">
        <div className="flex items-center space-x-3 p-2 rounded-2xl bg-slate-900/20 border border-slate-900/60">
          {/* Glowing Avatar */}
          <div className="relative">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/10 text-sm">
              {(() => {
                const storedName = localStorage.getItem("studentos_user_name") || "Tanu";
                const nameParts = storedName.trim().split(/\s+/);
                return nameParts.length > 1
                  ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
                  : storedName.substring(0, 2).toUpperCase();
              })()}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-extrabold text-white truncate font-sans">
              {localStorage.getItem("studentos_user_name") || "Tanu"}
            </p>
            <p className="text-[10px] text-slate-400 truncate font-mono">Level 4 Scholar</p>
          </div>
          {/* Sign Out Button */}
          <button
            id="logout-button"
            onClick={async () => {
              try {
                // Fetch current user and force a final cloud sync of the local snapshot
                const { data } = await supabase.auth.getUser();
                const user = data?.user;
                if (user && !user.id.startsWith("local_")) {
                  await pushLocalStateToFirestore(user.id);
                }
                await signOutUser();
              } catch (e) {
                console.error("Supabase sign out failed:", e);
              }
              onNavigate("login", "push_back");
            }}
            title="Log Out"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer font-sans text-[10px] font-bold border border-slate-900 hover:border-rose-500/20"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
