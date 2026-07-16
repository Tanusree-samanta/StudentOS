import React, { useState, useEffect, useRef } from "react";
import {
  Folder,
  FileText,
  Upload,
  Search,
  Download,
  Trash2,
  Edit2,
  Star,
  Pin,
  FileCode,
  FileImage,
  FileArchive,
  ArrowRight,
  Clock,
  HardDrive,
  FolderOpen,
  Plus,
  X,
  Eye,
  RefreshCw,
  TrendingUp,
  GraduationCap,
  AlertTriangle
} from "lucide-react";
import { ScreenID, SubjectFile } from "../types";
import Sidebar from "./Sidebar";
import { supabase, uploadNoteFile, getNoteFileUrl, deleteNoteFileFromStorage } from "../lib/supabaseService";

interface SubjectNotesScreenProps {
  onNavigate: (screen: ScreenID, direction: "none" | "push" | "push_back") => void;
}

const DEFAULT_SUBJECTS = [
  "Advanced Machine Learning",
  "Discrete Mathematics",
  "Database Management Systems",
  "Operating Systems",
  "Technical Communication"
];

const INITIAL_FILES: SubjectFile[] = [
  {
    id: "f1",
    subjectName: "Advanced Machine Learning",
    fileName: "Lecture_01_Backpropagation_Derivations.pdf",
    fileSize: "2.4 MB",
    fileType: "pdf",
    uploadDate: "2026-06-25",
    starred: true,
    pinned: true,
    contentUrl: "data:text/plain;base64,UERGX0ZJTEVfQ09OVEVOVF9ITU9DSw=="
  },
  {
    id: "f2",
    subjectName: "Database Management Systems",
    fileName: "DBMS_Normal_Forms_Cheat_Sheet.png",
    fileSize: "1.8 MB",
    fileType: "png",
    uploadDate: "2026-06-26",
    starred: false,
    pinned: true,
    contentUrl: "data:text/plain;base64,SU1BR0VfRklMRV9DT05URU5UX01PQ0s="
  },
  {
    id: "f3",
    subjectName: "Discrete Mathematics",
    fileName: "Combinatorics_Solved_Problems.docx",
    fileSize: "845 KB",
    fileType: "docx",
    uploadDate: "2026-06-22",
    starred: true,
    pinned: false,
    contentUrl: "data:text/plain;base64,RE9DX0ZJTEVfQ09OVEVOVF9NT0NL"
  },
  {
    id: "f4",
    subjectName: "Operating Systems",
    fileName: "Virtual_Memory_Paging_Simulator.txt",
    fileSize: "45 KB",
    fileType: "txt",
    uploadDate: "2026-06-28",
    starred: false,
    pinned: false,
    contentUrl: "data:text/plain;base64,VFhUX0ZJTEVfQ09OVEVOVF9NT0NL"
  }
];

export default function SubjectNotesScreen({ onNavigate }: SubjectNotesScreenProps) {
  const [subjects, setSubjects] = useState<string[]>(() => {
    const activeUid = localStorage.getItem("studentos_active_uid");
    const isLoggedIn = activeUid && activeUid !== "guest";
    const stored = localStorage.getItem("studentos_subject_folders");
    if (stored) {
      return JSON.parse(stored);
    }
    return isLoggedIn ? [] : DEFAULT_SUBJECTS;
  });

  const [files, setFiles] = useState<SubjectFile[]>(() => {
    const activeUid = localStorage.getItem("studentos_active_uid");
    const isLoggedIn = activeUid && activeUid !== "guest";
    const stored = localStorage.getItem("studentos_subject_files");
    if (stored) {
      return JSON.parse(stored);
    }
    return isLoggedIn ? [] : INITIAL_FILES;
  });

  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; type: "subject" | "file" } | null>(null);
  const [fileTypeFilter, setFileTypeFilter] = useState("all");
  const [isDragging, setIsDragging] = useState(false);
  
  // Modals/Actions States
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [viewingFile, setViewingFile] = useState<SubjectFile | null>(null);
  const [replacingFileId, setReplacingFileId] = useState<string | null>(null);
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem("studentos_subject_folders", JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem("studentos_subject_files", JSON.stringify(files));
  }, [files]);

  // Utility to convert file size string into numeric MB for total computation
  const parseSizeToMB = (sizeStr: string): number => {
    const num = parseFloat(sizeStr);
    if (sizeStr.toLowerCase().includes("kb")) {
      return num / 1024;
    }
    return num;
  };

  const getStorageUsage = () => {
    const totalMB = files.reduce((acc, f) => acc + parseSizeToMB(f.fileSize), 0);
    const quotaMB = 100; // Mock 100MB limit
    const percent = Math.min((totalMB / quotaMB) * 100, 100);
    return {
      used: totalMB.toFixed(2),
      quota: quotaMB,
      percent: percent.toFixed(1)
    };
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    if (subjects.some(s => s.toLowerCase() === newSubjectName.trim().toLowerCase())) {
      alert("Subject folder already exists.");
      return;
    }
    setSubjects([...subjects, newSubjectName.trim()]);
    setNewSubjectName("");
    setShowAddSubject(false);
  };

  const handleDeleteSubject = (subName: string) => {
    setDeleteConfirm({ id: subName, name: subName, type: "subject" });
  };

  // Helper to handle multiple file uploading simulation
  const processUploadedFiles = async (uploadedList: FileList, targetSubject: string) => {
    let userId = "local_guest";
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) {
        userId = data.user.id;
      }
    } catch (_) {}

    for (let i = 0; i < uploadedList.length; i++) {
      const fileObj = uploadedList[i];
      const extension = fileObj.name.split(".").pop()?.toLowerCase() || "txt";
      const sizeStr = fileObj.size > 1024 * 1024 
        ? `${(fileObj.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${Math.round(fileObj.size / 1024)} KB`;

      try {
        const { fileUrl, storagePath } = await uploadNoteFile(fileObj, userId);
        const newFile: SubjectFile = {
          id: Math.random().toString(36).substring(7),
          subjectName: targetSubject === "all" ? (subjects[0] || "General") : targetSubject,
          fileName: fileObj.name,
          fileSize: sizeStr,
          fileType: extension,
          uploadDate: new Date().toISOString().split("T")[0],
          starred: false,
          pinned: false,
          contentUrl: fileUrl,
          storagePath: storagePath
        };

        setFiles(prev => [newFile, ...prev]);
      } catch (err) {
        console.error("Failed to upload file:", err);
      }
    }
  };

  const handleFileUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFiles(e.target.files, selectedSubject);
    }
  };

  const handleFileReplaceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && replacingFileId) {
      const fileObj = e.target.files[0];
      const extension = fileObj.name.split(".").pop()?.toLowerCase() || "txt";
      const sizeStr = fileObj.size > 1024 * 1024 
        ? `${(fileObj.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${Math.round(fileObj.size / 1024)} KB`;

      let userId = "local_guest";
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.id) {
          userId = data.user.id;
        }
      } catch (_) {}

      try {
        const { fileUrl, storagePath } = await uploadNoteFile(fileObj, userId);
        setFiles(prev => prev.map(f => {
          if (f.id === replacingFileId) {
            return {
              ...f,
              fileName: fileObj.name,
              fileSize: sizeStr,
              fileType: extension,
              uploadDate: new Date().toISOString().split("T")[0],
              contentUrl: fileUrl,
              storagePath: storagePath
            };
          }
          return f;
        }));
        setReplacingFileId(null);
      } catch (err) {
        console.error("Failed to replace file:", err);
      }
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const triggerFileReplace = (id: string) => {
    setReplacingFileId(id);
    setTimeout(() => {
      replaceInputRef.current?.click();
    }, 50);
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFiles(e.dataTransfer.files, selectedSubject);
    }
  };

  const toggleStar = (id: string) => {
    setFiles(files.map(f => f.id === id ? { ...f, starred: !f.starred } : f));
  };

  const togglePin = (id: string) => {
    setFiles(files.map(f => f.id === id ? { ...f, pinned: !f.pinned } : f));
  };

  const startRename = (file: SubjectFile) => {
    setRenamingFileId(file.id);
    setRenameValue(file.fileName);
  };

  const saveRename = () => {
    if (!renameValue.trim()) return;
    setFiles(files.map(f => f.id === renamingFileId ? { ...f, fileName: renameValue.trim() } : f));
    setRenamingFileId(null);
  };

  const deleteFile = (id: string) => {
    const file = files.find(f => f.id === id);
    if (file) {
      setDeleteConfirm({ id, name: file.fileName, type: "file" });
    }
  };

  const triggerDownload = (file: SubjectFile) => {
    const link = document.createElement("a");
    link.href = file.contentUrl || "data:text/plain;base64,U0FNUExFX0ZJTEU=";
    link.setAttribute("download", file.fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

const handleOpenFileInNewTab = async (file: SubjectFile) => {
    setOpeningFileId(file.id);

    try {
      const fileUrl = (file.storagePath && !file.storagePath.startsWith("local_"))
        ? await getNoteFileUrl(file.storagePath)
        : (file.contentUrl || "");

      if (!fileUrl) {
        console.error("File URL missing");
        setErrorToast("Unable to retrieve file URL.");
        setOpeningFileId(null);
        return;
      }

      let finalUrl = fileUrl;

      if (fileUrl.startsWith("data:")) {
        const mimeMap: Record<string, string> = {
          pdf: "application/pdf",
          png: "image/png",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          gif: "image/gif",
          svg: "image/svg+xml",
          txt: "text/plain",
        };
        const correctMime = mimeMap[file.fileType.toLowerCase()] || "application/octet-stream";
        const parts = fileUrl.split(",");
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: correctMime });
        finalUrl = URL.createObjectURL(blob);
      }

      const newTab = window.open(finalUrl, "_blank");

      if (!newTab) {
        setErrorToast("Popup blocked! Please allow popups to view this file.");
      }
    } catch (err) {
      console.error("Error opening file in new tab:", err);
      setErrorToast("Unable to open file. Please try again.");
    } finally {
      setOpeningFileId(null);
    }
  };

  // Render Icons based on FileType
  const getFileIcon = (type: string) => {
    const t = type.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(t)) {
      return <FileImage className="h-6 w-6 text-emerald-400" />;
    }
    if (["zip", "rar", "tar", "gz", "7z"].includes(t)) {
      return <FileArchive className="h-6 w-6 text-amber-400" />;
    }
    if (["html", "css", "js", "ts", "json", "py", "java", "cpp", "c"].includes(t)) {
      return <FileCode className="h-6 w-6 text-indigo-400" />;
    }
    return <FileText className="h-6 w-6 text-violet-400" />;
  };

  // Filtering files
  const filteredFiles = files.filter(f => {
    const matchesSubject = selectedSubject === "all" || f.subjectName === selectedSubject;
    const matchesSearch = f.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = fileTypeFilter === "all" || 
      (fileTypeFilter === "document" && ["pdf", "docx", "doc", "txt", "pptx", "ppt"].includes(f.fileType.toLowerCase())) ||
      (fileTypeFilter === "image" && ["png", "jpg", "jpeg", "svg"].includes(f.fileType.toLowerCase())) ||
      (fileTypeFilter === "archive" && ["zip", "rar", "7z"].includes(f.fileType.toLowerCase()));
    
    return matchesSubject && matchesSearch && matchesType;
  });

  // Sort: Pinned first, then by upload date descending
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.uploadDate.localeCompare(a.uploadDate);
  });

  const storageInfo = getStorageUsage();

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden grid-bg">
      <Sidebar currentScreen="subject_notes" onNavigate={onNavigate} />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10">
        
        {/* Header Section */}
        <header className="p-8 pb-4 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-900/40 gap-4">
          <div>
            <span className="text-[10px] font-bold text-indigo-400 font-mono tracking-widest uppercase block">Cloud Notes Repo</span>
            <h1 className="text-2xl font-black text-white mt-1 tracking-tight font-sans">Subject Notes Manager</h1>
            <p className="text-xs text-slate-400 font-sans mt-0.5">Securely upload, organize, pin, and study academic materials</p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddSubject(true)}
              className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold font-sans cursor-pointer transition-colors"
            >
              <Plus className="h-4 w-4 text-indigo-400" />
              <span>Create Folder</span>
            </button>
            <button
              onClick={triggerFileUpload}
              className="flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl px-4 py-2 text-xs font-bold font-sans cursor-pointer transition-colors shadow-md shadow-indigo-500/10"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Notes</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUploadChange}
              multiple
              className="hidden"
            />
            <input
              type="file"
              ref={replaceInputRef}
              onChange={handleFileReplaceChange}
              className="hidden"
            />
          </div>
        </header>

        <div className="p-8 space-y-8">
          
          {/* Storage & Recent Activity row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Storage Usage Widget */}
            <div className="glass-panel border border-slate-900 bg-slate-900/15 p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 font-sans uppercase tracking-wider block">Storage Vault</span>
                  <HardDrive className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="flex items-baseline space-x-1.5 mt-2">
                  <h3 className="text-3xl font-black text-white font-mono">{storageInfo.used}</h3>
                  <span className="text-xs text-slate-500 font-mono">/ {storageInfo.quota} MB</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-sans">High fidelity document cloud allocation</p>
              </div>

              <div className="mt-6 space-y-1.5">
                <div className="w-full bg-slate-950 border border-slate-900/60 h-2.5 rounded-full overflow-hidden p-0.5">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${storageInfo.percent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
                  <span>{storageInfo.percent}% consumed</span>
                  <span>Unlimited standard transfers</span>
                </div>
              </div>
            </div>

            {/* Quick Stats Widget */}
            <div className="glass-panel border border-slate-900 bg-slate-900/15 p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-300 font-sans uppercase tracking-wider block mb-3">Document Index</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/40 border border-slate-900/60 p-3 rounded-2xl">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Total Files</span>
                    <p className="text-2xl font-black text-white font-mono mt-0.5">{files.length}</p>
                  </div>
                  <div className="bg-slate-950/40 border border-slate-900/60 p-3 rounded-2xl">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Pinned/Starred</span>
                    <p className="text-2xl font-black text-indigo-400 font-mono mt-0.5">
                      {files.filter(f => f.pinned || f.starred).length}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal mt-4 font-sans">
                Drag and drop files anywhere on the page to instantly classify under the active folder.
              </p>
            </div>

            {/* Recently Uploaded Feed */}
            <div className="glass-panel border border-slate-900 bg-slate-900/15 p-6 rounded-3xl">
              <span className="text-xs font-bold text-slate-300 font-sans uppercase tracking-wider block mb-3">Recent Uploads</span>
              
              <div className="space-y-3 max-h-[115px] overflow-y-auto">
                {files.slice(0, 3).map(f => (
                  <div key={f.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/20 border border-slate-900/60 text-xs">
                    <div className="flex items-center space-x-2 min-w-0">
                      {getFileIcon(f.fileType)}
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate max-w-[150px] font-sans">{f.fileName}</p>
                        <p className="text-[9px] text-slate-400 font-mono">{f.subjectName}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 whitespace-nowrap">{f.uploadDate}</span>
                  </div>
                ))}
                {files.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">No documents uploaded yet.</p>
                )}
              </div>
            </div>

          </div>

          {/* Core Folder & Files Grid Explorer */}
          <div className="space-y-6">
            
            {/* Filter controls search toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/20 border border-slate-900">
              
              {/* Left filter selectors */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSelectedSubject("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-sans cursor-pointer transition-all ${
                    selectedSubject === "all"
                      ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/10"
                      : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  All Subjects
                </button>
                {subjects.map(s => (
                  <div key={s} className="relative group/folder flex items-center">
                    <button
                      onClick={() => setSelectedSubject(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold font-sans cursor-pointer transition-all pr-7 ${
                        selectedSubject === s
                          ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/10"
                          : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900"
                      }`}
                    >
                      {s}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSubject(s);
                      }}
                      className="absolute right-1 text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover/folder:opacity-100 transition-opacity rounded cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Right search and type filters */}
              <div className="flex items-center space-x-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search file name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8.5 pr-3 py-1.5 bg-slate-950 border border-slate-900 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <select
                  value={fileTypeFilter}
                  onChange={(e) => setFileTypeFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-900 text-xs text-slate-300 font-sans rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                >
                  <option value="all">All Formats</option>
                  <option value="document">Docs (PDF, Word, TXT)</option>
                  <option value="image">Images (PNG, JPG)</option>
                  <option value="archive">Archives (ZIP, RAR)</option>
                </select>
              </div>
            </div>

            {/* Drag & Drop Upload Zone Wrapper */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-3xl p-6 transition-all ${
                isDragging 
                  ? "border-indigo-500 bg-indigo-500/5 shadow-2xl scale-[1.01]" 
                  : "border-slate-900 bg-transparent"
              }`}
            >
              {isDragging && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center z-40 pointer-events-none">
                  <Upload className="h-12 w-12 text-indigo-400 animate-bounce mb-3" />
                  <p className="text-base font-black text-white font-sans">Drop files to instantly upload</p>
                  <p className="text-xs text-slate-400 font-sans mt-1">Files will automatically categorize under {selectedSubject === "all" ? "first active folder" : selectedSubject}</p>
                </div>
              )}

              {/* files rendering listing */}
              {sortedFiles.length === 0 ? (
                <div className="text-center py-16 flex flex-col items-center">
                  <FolderOpen className="h-16 w-16 text-slate-800 mb-4" />
                  <h3 className="text-sm font-bold text-slate-400 font-sans">No matching study files found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 font-sans">
                    Upload documents or change your filters to see the contents of this subject folder.
                  </p>
                  <button
                    onClick={triggerFileUpload}
                    className="mt-4 flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer"
                  >
                    <Upload className="h-4 w-4 text-indigo-400" />
                    <span>Browse Files</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedFiles.map(file => {
                    const isRenaming = file.id === renamingFileId;
                    return (
                      <div 
                        key={file.id} 
                        onClick={() => handleOpenFileInNewTab(file)}
                        className={`group relative glass-panel border p-5 rounded-2xl transition-all hover:scale-[1.015] cursor-pointer hover:bg-slate-900/30 hover:border-indigo-500/20 ${
                          file.pinned 
                            ? "border-indigo-500/30 bg-indigo-500/2" 
                            : "border-slate-900 hover:border-slate-800"
                        }`}
                      >
                        
                        {/* Header of file card */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            {openingFileId === file.id ? (
                              <div className="flex items-center justify-center h-6 w-6 shrink-0 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                                <RefreshCw className="h-3.5 w-3.5 text-indigo-400 animate-spin" />
                              </div>
                            ) : (
                              getFileIcon(file.fileType)
                            )}
                            <div className="min-w-0 flex-1">
                              {isRenaming ? (
                                <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-xs text-white focus:outline-none w-full font-sans"
                                    autoFocus
                                  />
                                  <button
                                    onClick={(e) => { e.stopPropagation(); saveRename(); }}
                                    className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded cursor-pointer"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <h4 className="font-extrabold text-xs text-white truncate font-sans group-hover:text-indigo-300 transition-colors" title={file.fileName}>
                                  {file.fileName}
                                </h4>
                              )}
                               <p className="text-[9px] text-slate-400 font-mono mt-0.5 flex items-center space-x-1.5 w-full">
                                 <span>{file.fileSize}</span>
                                 <span>•</span>
                                 <span className="uppercase">{file.fileType} format</span>
                                 {openingFileId === file.id ? (
                                   <span className="text-indigo-400 font-sans text-[8px] font-bold ml-auto animate-pulse">Opening secure tab...</span>
                                 ) : (
                                   <span className="text-indigo-400/80 opacity-0 group-hover:opacity-100 transition-opacity ml-auto font-sans text-[8px] font-bold">Click to open</span>
                                 )}
                               </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 ml-2 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); togglePin(file.id); }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                file.pinned 
                                  ? "text-indigo-400 bg-indigo-500/10" 
                                  : "text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/5 opacity-0 group-hover:opacity-100"
                              }`}
                              title={file.pinned ? "Unpin document" : "Pin to top"}
                            >
                              <Pin className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleStar(file.id); }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                file.starred 
                                  ? "text-amber-400 bg-amber-500/10" 
                                  : "text-slate-500 hover:text-amber-400 hover:bg-amber-500/5 opacity-0 group-hover:opacity-100"
                              }`}
                              title={file.starred ? "Remove favorite" : "Mark as favorite"}
                            >
                              <Star className={`h-3.5 w-3.5 ${file.starred ? "fill-amber-400" : ""}`} />
                            </button>
                          </div>
                        </div>

                        {/* Subject folder tag */}
                        <div className="mt-4 flex items-center justify-between text-[10px]">
                          <span className="px-2 py-0.5 bg-slate-950 border border-slate-900 rounded font-mono text-slate-400 truncate max-w-[150px]">
                            {file.subjectName}
                          </span>
                          <span className="text-slate-500 font-mono text-[9px]">{file.uploadDate}</span>
                        </div>

                        {/* Hover Quick actions overlay bar */}
                        <div className="mt-4 pt-3 border-t border-slate-900/60 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenFileInNewTab(file); }}
                              disabled={openingFileId === file.id}
                              className="flex items-center space-x-1 px-2 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-900 rounded-lg text-[10px] text-slate-300 font-semibold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {openingFileId === file.id ? (
                                <RefreshCw className="h-3 w-3 animate-spin text-indigo-400" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                              <span>{openingFileId === file.id ? "Opening..." : "View"}</span>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); triggerDownload(file); }}
                              className="flex items-center space-x-1 px-2 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-900 rounded-lg text-[10px] text-slate-300 font-semibold cursor-pointer transition-colors"
                            >
                              <Download className="h-3 w-3" />
                              <span>Get</span>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); triggerFileReplace(file.id); }}
                              className="flex items-center space-x-1 px-2 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-900 rounded-lg text-[10px] text-slate-300 font-semibold cursor-pointer transition-colors"
                              title="Replace file with new upload"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>Replace</span>
                            </button>
                          </div>

                          <div className="flex items-center space-x-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); startRename(file); }}
                              className="p-1 hover:bg-slate-900 rounded cursor-pointer text-slate-400 hover:text-white"
                              title="Rename document"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }}
                              className="p-1 hover:bg-red-500/10 rounded cursor-pointer text-slate-400 hover:text-red-400"
                              title="Delete document"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Modal: Create Subject Folder */}
        {showAddSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-md bg-slate-950 border border-slate-900 p-6 rounded-3xl space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-extrabold text-white tracking-tight font-sans">Create Subject Vault</h3>
                <button
                  onClick={() => setShowAddSubject(false)}
                  className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddSubject} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Folder Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Advanced Artificial Intelligence"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 text-xs"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSubject(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-md shadow-indigo-500/10"
                  >
                    Create Folder
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: View File Reader */}
        {viewingFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-2xl bg-slate-950 border border-slate-900 p-6 rounded-3xl space-y-4 flex flex-col max-h-[85vh]">
              <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                <div className="flex items-center space-x-2.5">
                  {getFileIcon(viewingFile.fileType)}
                  <div>
                    <h3 className="text-sm font-extrabold text-white font-sans max-w-[300px] truncate">{viewingFile.fileName}</h3>
                    <p className="text-[9px] text-slate-400 font-mono uppercase mt-0.5">{viewingFile.subjectName} • {viewingFile.fileSize}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => triggerDownload(viewingFile)}
                    className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                    title="Download locally"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewingFile(null)}
                    className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Reader View Body */}
              <div className="flex-1 overflow-y-auto bg-slate-950 border border-slate-900 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[300px] relative">
                
                {["png", "jpg", "jpeg", "svg"].includes(viewingFile.fileType.toLowerCase()) ? (
                  <div className="space-y-4 text-center">
                    <img
                      src={viewingFile.contentUrl || "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=600&auto=format&fit=crop"}
                      alt={viewingFile.fileName}
                      className="max-h-[40vh] mx-auto rounded-xl object-contain border border-slate-900 shadow-xl"
                    />
                    <p className="text-[10px] text-slate-400 font-sans">Full fidelity secure render mode</p>
                  </div>
                ) : viewingFile.fileType.toLowerCase() === "pdf" ? (
                  <div className="text-center space-y-4 max-w-md">
                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/15 rounded-3xl w-fit mx-auto">
                      <GraduationCap className="h-10 w-10 text-indigo-400 animate-pulse" />
                    </div>
                    <h4 className="text-sm font-extrabold text-white font-sans">PDF Document Viewer</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      This PDF contains high-density study charts, equations, and references. Since we are inside the preview, download the document to view full local formatting or print physical copies.
                    </p>
                  </div>
                ) : (
                  <div className="w-full text-left font-mono text-xs text-slate-300 p-4 rounded-xl bg-slate-950/80 border border-slate-900 h-full overflow-y-auto max-h-[350px]">
                    <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block border-b border-slate-900 pb-2 mb-3">Plain Text Transcripts</span>
                    {`# ${viewingFile.fileName}

Welcome to StudentOS secure text transcriber. 
File type: ${viewingFile.fileType.toUpperCase()}
Storage signature: SHA256-${viewingFile.id}f89e217c9921b36aef42

---
The academic document has been indexed and validated for study routines. Please click the download button in the toolbar above to save the original formatting, spreadsheets, slides, or zip files locally.`}
                  </div>
                )}

              </div>
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
                  {deleteConfirm.type === "subject" ? "Delete Subject Folder" : "Delete Document"}
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                {deleteConfirm.type === "subject" ? (
                  <>Are you sure you want to delete the folder <span className="text-white font-semibold">"{deleteConfirm.name}"</span> and all its files?</>
                ) : (
                  <>Are you sure you want to delete the file <span className="text-white font-semibold">"{deleteConfirm.name}"</span>?</>
                )}
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
                    if (deleteConfirm.type === "subject") {
                      // Delete all files in this folder from Supabase Storage
                      const folderFiles = files.filter(f => f.subjectName === deleteConfirm.id);
                      folderFiles.forEach(f => {
                        if (f.storagePath) {
                          deleteNoteFileFromStorage(f.storagePath).catch(err => {
                            console.warn("Error deleting note file from storage:", err);
                          });
                        }
                      });

                      setSubjects(subjects.filter(s => s !== deleteConfirm.id));
                      setFiles(files.filter(f => f.subjectName !== deleteConfirm.id));
                      if (selectedSubject === deleteConfirm.id) {
                        setSelectedSubject("all");
                      }
                    } else {
                      const fileToDelete = files.find(f => f.id === deleteConfirm.id);
                      if (fileToDelete && fileToDelete.storagePath) {
                        deleteNoteFileFromStorage(fileToDelete.storagePath).catch(err => {
                          console.warn("Error deleting note file from storage:", err);
                        });
                      }

                      setFiles(files.filter(f => f.id !== deleteConfirm.id));
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

        {errorToast && (
          <div className="fixed top-6 right-6 z-[200] flex items-center space-x-2 bg-rose-950/90 backdrop-blur-md border border-rose-500/30 px-4 py-3 rounded-2xl text-xs font-semibold shadow-2xl text-rose-200 animate-in fade-in slide-in-from-top-4 duration-300">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <span>{errorToast}</span>
          </div>
        )}

      </main>
    </div>
  );
}