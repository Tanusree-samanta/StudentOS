import React, { useState, useEffect } from "react";
import {
  Award,
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  Search,
  BookOpen,
  ChevronRight,
  GraduationCap,
  Sparkles,
  ChevronUp,
  HelpCircle,
  BarChart2,
  Check,
  X,
  AlertTriangle
} from "lucide-react";
import { ScreenID, CgpaSemester } from "../types";
import Sidebar from "./Sidebar";

interface CgpaScreenProps {
  onNavigate: (screen: ScreenID, direction: "none" | "push" | "push_back") => void;
}

const DEFAULT_SEMESTERS: CgpaSemester[] = [
  { id: "sem1", semesterName: "Semester 1", gpa: 8.50, credits: 20 },
  { id: "sem2", semesterName: "Semester 2", gpa: 8.65, credits: 20 },
  { id: "sem3", semesterName: "Semester 3", gpa: 8.80, credits: 18 },
  { id: "sem4", semesterName: "Semester 4", gpa: 8.95, credits: 20 }
];

export default function CgpaScreen({ onNavigate }: CgpaScreenProps) {
  const [semesters, setSemesters] = useState<CgpaSemester[]>(() => {
    const activeUid = localStorage.getItem("studentos_active_uid");
    const isLoggedIn = activeUid && activeUid !== "guest";
    const stored = localStorage.getItem("studentos_semesters");
    if (stored) {
      return JSON.parse(stored);
    }
    return isLoggedIn ? [] : DEFAULT_SEMESTERS;
  });

  const [searchQuery, setSearchQuery] = useState("");

  // Semester Modal States
  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [modalType, setModalType] = useState<"add" | "edit">("add");
  const [editingSemId, setEditingSemId] = useState<string | null>(null);
  const [semName, setSemName] = useState("");
  const [semGpa, setSemGpa] = useState<number>(8.5);
  const [semCredits, setSemCredits] = useState<number>(20);

  // Predictor States
  const [targetCgpa, setTargetCgpa] = useState<number>(9.0);
  const [remainingCredits, setRemainingCredits] = useState<number>(40);

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    localStorage.setItem("studentos_semesters", JSON.stringify(semesters));
    
    // Save cumulative CGPA so Dashboard can read it instantly
    const { cgpa } = calculateMetrics();
    localStorage.setItem("studentos_cumulative_cgpa", cgpa.toString());
  }, [semesters]);

  const calculateMetrics = () => {
    let totalCredits = 0;
    let totalPoints = 0;
    let bestSem: CgpaSemester | null = null;
    let worstSem: CgpaSemester | null = null;

    semesters.forEach(s => {
      totalCredits += s.credits;
      totalPoints += s.gpa * s.credits;

      if (!bestSem || s.gpa > bestSem.gpa) {
        bestSem = s;
      }
      if (!worstSem || s.gpa < worstSem.gpa) {
        worstSem = s;
      }
    });

    const cgpa = totalCredits === 0 ? 0 : Math.round((totalPoints / totalCredits) * 100) / 100;

    return {
      cgpa,
      totalCredits,
      bestGpa: bestSem ? (bestSem as CgpaSemester).gpa : 0,
      bestName: bestSem ? (bestSem as CgpaSemester).semesterName : "N/A",
      worstGpa: worstSem ? (worstSem as CgpaSemester).gpa : 0,
      worstName: worstSem ? (worstSem as CgpaSemester).semesterName : "N/A"
    };
  };

  const { cgpa, totalCredits, bestGpa, bestName, worstGpa, worstName } = calculateMetrics();

  const handleSaveSemester = (e: React.FormEvent) => {
    e.preventDefault();
    if (!semName.trim()) return;

    if (semGpa < 0 || semGpa > 10) {
      alert("GPA must be between 0 and 10.");
      return;
    }

    if (semCredits <= 0) {
      alert("Credits must be a positive number.");
      return;
    }

    if (modalType === "add") {
      const newSem: CgpaSemester = {
        id: Math.random().toString(36).substring(7),
        semesterName: semName.trim(),
        gpa: Number(semGpa),
        credits: Number(semCredits)
      };
      setSemesters([...semesters, newSem]);
    } else if (modalType === "edit" && editingSemId) {
      setSemesters(semesters.map(s => s.id === editingSemId ? {
        ...s,
        semesterName: semName.trim(),
        gpa: Number(semGpa),
        credits: Number(semCredits)
      } : s));
    }

    setShowSemesterModal(false);
    resetForm();
  };

  const startAddSemester = () => {
    setModalType("add");
    setSemName(`Semester ${semesters.length + 1}`);
    setSemGpa(8.5);
    setSemCredits(20);
    setShowSemesterModal(true);
  };

  const startEditSemester = (sem: CgpaSemester) => {
    setModalType("edit");
    setEditingSemId(sem.id);
    setSemName(sem.semesterName);
    setSemGpa(sem.gpa);
    setSemCredits(sem.credits);
    setShowSemesterModal(true);
  };

  const handleDeleteSemester = (id: string, name: string) => {
    setDeleteConfirm({ id, name });
  };

  const resetForm = () => {
    setEditingSemId(null);
    setSemName("");
    setSemGpa(8.5);
    setSemCredits(20);
  };

  // Prediction calculator
  const calculateRequiredGpa = () => {
    if (remainingCredits <= 0) return 0;
    const currentPoints = semesters.reduce((acc, s) => acc + (s.gpa * s.credits), 0);
    const targetTotalPoints = targetCgpa * (totalCredits + remainingCredits);
    const neededPoints = targetTotalPoints - currentPoints;
    const requiredGpa = neededPoints / remainingCredits;
    return Math.max(0, Math.round(requiredGpa * 100) / 100);
  };

  const requiredGpa = calculateRequiredGpa();

  // Filtered semesters based on search
  const filteredSemesters = semesters.filter(s =>
    s.semesterName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden grid-bg">
      <Sidebar currentScreen="cgpa" onNavigate={onNavigate} />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10">
        
        {/* Header Section */}
        <header className="p-8 pb-4 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-900/40 gap-4">
          <div>
            <span className="text-[10px] font-bold text-indigo-400 font-mono tracking-widest uppercase block">Transcripts & Goals Audit</span>
            <h1 className="text-2xl font-black text-white mt-1 tracking-tight font-sans">CGPA Performance Engine</h1>
            <p className="text-xs text-slate-400 font-sans mt-0.5">Edit academic semesters, model grade point progression, and calculate predicted milestones</p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search semesters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 bg-slate-900/40 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 text-xs font-sans"
              />
            </div>
            <button
              onClick={startAddSemester}
              className="flex items-center space-x-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold font-sans rounded-xl px-4 py-2 cursor-pointer transition-colors shadow-md shadow-indigo-500/10 shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Add Semester</span>
            </button>
          </div>
        </header>

        {/* Dashboard KPIs */}
        <div className="p-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* KPI 1: Cumulative CGPA */}
            <div className="glass-panel border border-slate-900 p-5 rounded-2xl relative overflow-hidden bg-gradient-to-br from-indigo-500/5 to-transparent">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Overall Cumulative CGPA</span>
              <div className="flex items-baseline space-x-1.5 mt-2">
                <h3 className="text-3xl font-black text-indigo-400 font-mono">{cgpa.toFixed(2)}</h3>
                <span className="text-xs text-slate-500 font-mono">/ 10.0</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-sans">Degree cumulative credit weighted</p>
            </div>

            {/* KPI 2: Total Credits */}
            <div className="glass-panel border border-slate-900 p-5 rounded-2xl relative overflow-hidden bg-gradient-to-br from-violet-500/5 to-transparent">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Accumulated Credits</span>
              <div className="flex items-baseline space-x-1.5 mt-2">
                <h3 className="text-3xl font-black text-violet-400 font-mono">{totalCredits}</h3>
                <span className="text-xs text-slate-500 font-mono">Credits</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-sans">Academic units completed</p>
            </div>

            {/* KPI 3: Best Semester */}
            <div className="glass-panel border border-slate-900 p-5 rounded-2xl relative overflow-hidden">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Highest Semester GPA</span>
              <div className="flex items-baseline space-x-1.5 mt-2">
                <h3 className="text-3xl font-black text-emerald-400 font-mono">{bestGpa.toFixed(2)}</h3>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-sans truncate">{bestName} peak standing</p>
            </div>

            {/* KPI 4: Lowest Semester */}
            <div className="glass-panel border border-slate-900 p-5 rounded-2xl relative overflow-hidden">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Lowest Semester GPA</span>
              <div className="flex items-baseline space-x-1.5 mt-2">
                <h3 className="text-3xl font-black text-rose-400 font-mono">{worstGpa.toFixed(2)}</h3>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-sans truncate">{worstName} baseline standing</p>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Semesters Ledger & Editor (2/3 cols) */}
            <div className="lg:col-span-2 glass-panel border border-slate-900 p-6 rounded-3xl space-y-6">
              <div>
                <h3 className="text-sm font-extrabold tracking-wider text-slate-300 uppercase font-mono">Academic Semesters Ledger</h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">Manage and calibrate individual semestral GPAs instantly</p>
              </div>

              {/* Semester List Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                      <th className="pb-3 pl-2">Semester Descriptor</th>
                      <th className="pb-3">Course Credits Allocation</th>
                      <th className="pb-3">Semester SGPA</th>
                      <th className="pb-3">Weighted Score</th>
                      <th className="pb-3 text-right pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60 text-xs">
                    {filteredSemesters.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-900/10">
                        <td className="py-4 pl-2 font-extrabold text-white font-sans">{s.semesterName}</td>
                        <td className="py-4 font-mono text-slate-300">{s.credits} Credits</td>
                        <td className="py-4 font-mono text-indigo-400 font-bold">{s.gpa.toFixed(2)}</td>
                        <td className="py-4 font-mono text-slate-400">{(s.gpa * s.credits).toFixed(1)} pts</td>
                        <td className="py-4 text-right pr-2">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => startEditSemester(s)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg cursor-pointer"
                              title="Edit GPA & credits"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSemester(s.id, s.semesterName)}
                              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                              title="Delete semester entry"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredSemesters.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-slate-500 font-sans">
                          No semestral transcript logs detected. Create one to calculate.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Dynamic credit weight calculation note */}
              <div className="p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-2xl text-xs text-slate-300 leading-normal font-sans">
                <span className="font-bold text-indigo-300 uppercase tracking-wider block mb-1 text-[10px] font-mono">Cumulative Weight Audit Log</span>
                Aggregated weighted formula: <code className="bg-slate-950 px-1 py-0.5 rounded font-mono text-[10px] text-indigo-400">Σ(GPA_i * Credits_i) / ΣCredits_i</code>. Your current records yield <span className="font-bold text-indigo-300">{semesters.length} semesters</span> with a total cumulative point weight of <span className="font-bold text-indigo-300 font-mono">{semesters.reduce((acc, s) => acc + (s.gpa * s.credits), 0).toFixed(1)} points</span> over <span className="font-bold text-indigo-300 font-mono">{totalCredits} units</span>.
              </div>
            </div>

            {/* Right Column: custom SVG Graph & Prediction tool (1/3 col) */}
            <div className="space-y-6">
              
              {/* Custom SVG Progression Chart (100% responsive, high-fidelity) */}
              <div className="glass-panel border border-slate-900 p-6 rounded-3xl space-y-4">
                <h3 className="text-xs font-extrabold tracking-wider text-slate-300 uppercase font-mono">Historical GPA Progression</h3>
                
                {semesters.length > 1 ? (
                  <div className="pt-4 h-44 w-full relative">
                    {/* SVG Line Chart representation */}
                    <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                      {/* Grid Lines */}
                      <line x1="0" y1="10" x2="100" y2="10" stroke="#1e293b" strokeWidth="0.3" strokeDasharray="1 1" />
                      <line x1="0" y1="20" x2="100" y2="20" stroke="#1e293b" strokeWidth="0.3" strokeDasharray="1 1" />
                      <line x1="0" y1="30" x2="100" y2="30" stroke="#1e293b" strokeWidth="0.3" strokeDasharray="1 1" />

                      {/* Sparkline Path */}
                      {(() => {
                        const points = semesters.map((s, idx) => {
                          const x = (idx / (semesters.length - 1)) * 100;
                          // Scale GPA 0-10 so that 7 is bottom, 10 is top of graph (y-axis)
                          const normalizedGpa = Math.max(7, Math.min(10, s.gpa));
                          const y = 35 - ((normalizedGpa - 7) / 3) * 30;
                          return { x, y, gpa: s.gpa, name: s.semesterName };
                        });

                        const pathD = points.reduce((acc, p, idx) => 
                          idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, ""
                        );

                        return (
                          <>
                            {/* Area Fill */}
                            <path
                              d={`${pathD} L 100 40 L 0 40 Z`}
                              fill="url(#gpaAreaGrad)"
                              opacity="0.15"
                            />
                            {/* Stroke Line */}
                            <path
                              d={pathD}
                              fill="none"
                              stroke="url(#gpaLineGrad)"
                              strokeWidth="1.2"
                              strokeLinecap="round"
                            />
                            {/* Interactive Data Nodes */}
                            {points.map((p, idx) => (
                              <g key={idx} className="group/node cursor-pointer">
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="1.5"
                                  className="fill-indigo-400 stroke-slate-950 stroke-[0.8] hover:r-2 transition-all"
                                />
                              </g>
                            ))}
                            {/* Definitions */}
                            <defs>
                              <linearGradient id="gpaLineGrad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#8b5cf6" />
                              </linearGradient>
                              <linearGradient id="gpaAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#000000" />
                              </linearGradient>
                            </defs>
                          </>
                        );
                      })()}
                    </svg>

                    {/* X-axis labels */}
                    <div className="flex justify-between items-center text-[8px] font-mono text-slate-500 pt-2 px-1">
                      {semesters.map((s, idx) => (
                        <span key={idx}>{s.semesterName.substring(0, 5)}</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-12 font-sans">
                    Log at least 2 semesters to activate GPA graph progression metrics.
                  </p>
                )}
              </div>

              {/* Goal Prediction Tool */}
              <div className="glass-panel border border-violet-500/15 p-6 rounded-3xl bg-gradient-to-br from-violet-500/5 to-transparent space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-violet-500/15 rounded border border-violet-500/30">
                    <Sparkles className="h-4 w-4 text-violet-400" />
                  </div>
                  <h3 className="text-xs font-extrabold tracking-wider text-slate-300 uppercase font-mono">Academic Prediction Simulator</h3>
                </div>

                <p className="text-[11px] text-slate-400 leading-normal font-sans">
                  Calculate what GPA you must score in remaining modules to hit a target Cumulative standing:
                </p>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-400">Target Cumulative CGPA</span>
                      <span className="text-white font-extrabold">{targetCgpa.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="7.0"
                      max="10.0"
                      step="0.05"
                      value={targetCgpa}
                      onChange={(e) => setTargetCgpa(Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer h-1 rounded bg-slate-900 border border-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-400">Remaining Degree Credits</span>
                      <span className="text-white font-extrabold">{remainingCredits} Credits</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="120"
                      step="4"
                      value={remainingCredits}
                      onChange={(e) => setRemainingCredits(Number(e.target.value))}
                      className="w-full accent-violet-500 cursor-pointer h-1 rounded bg-slate-900 border border-slate-800"
                    />
                  </div>
                </div>

                {/* Predict Results Badge */}
                <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-900/80 text-center space-y-1">
                  <span className="text-[9px] font-mono uppercase text-slate-500 block">Required Average SGPA</span>
                  {requiredGpa > 10.0 ? (
                    <div className="space-y-1">
                      <h4 className="text-xl font-black text-rose-500 font-mono">Mathematically Unachievable</h4>
                      <p className="text-[9px] text-slate-500 leading-normal font-sans">Target CGPA requires {requiredGpa.toFixed(2)} GPA, exceeding the max 10.0 standard score. Consider scaling target bounds.</p>
                    </div>
                  ) : requiredGpa <= 4.0 ? (
                    <div className="space-y-1">
                      <h4 className="text-xl font-black text-emerald-400 font-mono">Easily Attained (&lt; 4.00)</h4>
                      <p className="text-[9px] text-slate-500 leading-normal font-sans">You have heavily pre-completed credit indexes. Keep standard passing grades to secure goals.</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <h4 className="text-2xl font-black text-violet-400 font-mono">{requiredGpa.toFixed(2)} SGPA</h4>
                      <p className="text-[9px] text-slate-500 leading-normal font-sans">You need an average semester SGPA of {requiredGpa.toFixed(2)} over the next {remainingCredits} credits to secure {targetCgpa.toFixed(2)} CGPA.</p>
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* Modal: Add/Edit Semester GPA */}
        {showSemesterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-md bg-slate-950 border border-slate-900 p-6 rounded-3xl space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-extrabold text-white tracking-tight font-sans">
                  {modalType === "add" ? "Log Academic Semester" : "Modify Semestral Standing"}
                </h3>
                <button
                  onClick={() => setShowSemesterModal(false)}
                  className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSemester} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Semester Descriptor</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Semester 4"
                    value={semName}
                    onChange={(e) => setSemName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Semester SGPA (0.00 - 10.00)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="10"
                      step="0.01"
                      value={semGpa}
                      onChange={(e) => setSemGpa(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Course Credits Allocation</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="30"
                      value={semCredits}
                      onChange={(e) => setSemCredits(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSemesterModal(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-md shadow-indigo-500/10"
                  >
                    {modalType === "add" ? "Create Semester" : "Save Calibration"}
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
                <h3 className="text-sm font-bold text-white font-sans font-extrabold">Delete Semester Data</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Are you sure you want to permanently delete <span className="text-white font-semibold">{deleteConfirm.name}</span> data? This action will instantly recalculate your cumulative CGPA standing.
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
                    setSemesters(semesters.filter(s => s.id !== deleteConfirm.id));
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
