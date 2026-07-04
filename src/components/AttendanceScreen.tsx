import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  Upload,
  Download,
  Check,
  X,
  Sliders,
  Settings,
  FileText,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Info,
  Sun,
  Moon,
  Printer,
  RotateCcw
} from "lucide-react";
import { ScreenID, SubjectAttendance } from "../types";
import Sidebar from "./Sidebar";
import EmptyState from "./EmptyState";

interface AttendanceScreenProps {
  onNavigate: (screen: ScreenID, direction: "none" | "push" | "push_back") => void;
  subjects: SubjectAttendance[];
  setSubjects: React.Dispatch<React.SetStateAction<SubjectAttendance[]>>;
  overallPercent: number;
}

// Data models internal to this module
interface RoutineItem {
  id: string;
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  time: string;
  subjectId: string;
  room: string;
}

interface AttendanceLog {
  id: string;
  date: string; // YYYY-MM-DD
  subjectId: string;
  status: "Present" | "Absent" | "Holiday";
  timeSlot: string;
  room: string;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
type DayType = typeof DAYS_OF_WEEK[number];

// Helper: get today's date as YYYY-MM-DD (real date, not hardcoded)
function getTodayStr(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function detectDay(val: any): DayType | null {
  if (!val) return null;
  const str = String(val).trim().toLowerCase();
  for (const d of DAYS_OF_WEEK) {
    if (str === d.toLowerCase() || str.startsWith(d.toLowerCase())) {
      return d;
    }
  }
  return null;
}

function parseSubjectAndRoom(cellValue: string): { subject: string; room: string } {
  const str = cellValue.trim();
  if (!str) return { subject: "", room: "TBD" };

  // Parentheses: "Mathematics (Room 301)"
  const parenMatch = str.match(/(.*?)\((Room|Lab|Hall|Auditorium|Classroom)?\s*([A-Za-z0-9\- ]+)\)/i);
  if (parenMatch) {
    const subject = parenMatch[1].trim();
    let room = parenMatch[3].trim();
    if (parenMatch[2]) {
      room = `${parenMatch[2]} ${room}`;
    }
    return { subject, room };
  }

  // Split: "Networks, Room 205" or "Math - Lab 1"
  const splitters = [",", "/", " - ", " – "];
  for (const splitter of splitters) {
    if (str.includes(splitter)) {
      const parts = str.split(splitter);
      const subject = parts[0].trim();
      const roomPart = parts[1].trim();
      if (roomPart.toLowerCase().includes("room") || roomPart.toLowerCase().includes("lab") || roomPart.toLowerCase().includes("hall") || /\b\d{3}\b/.test(roomPart)) {
        return { subject, room: roomPart };
      }
    }
  }

  // Keyword: "Chemistry Lab 1"
  const keywordMatch = str.match(/(.*?)\b(Room|Lab|Hall|Auditorium|Classroom)\s*([A-Za-z0-9\- ]+)/i);
  if (keywordMatch) {
    return {
      subject: keywordMatch[1].trim() || "Lecture",
      room: `${keywordMatch[2]} ${keywordMatch[3]}`.trim()
    };
  }

  return { subject: str, room: "TBD" };
}

function normalizeTimeSlot(val: any): string | null {
  if (!val) return null;
  const str = String(val).trim().replace(/\s+/g, " ");

  const timeRangeRegex = /\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\s*(?:-|to)\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\b/i;
  const match = str.match(timeRangeRegex);
  if (match) {
    let range = match[0].toUpperCase();
    if (!range.includes("AM") && !range.includes("PM")) {
      range = range + " AM";
    }
    return range;
  }

  const singleTimeRegex = /\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\b/i;
  const singleMatch = str.match(singleTimeRegex);
  if (singleMatch) {
    const start = singleMatch[0].toUpperCase();
    return `${start} - Class`;
  }

  if (/period\s*\d|\d(?:st|nd|rd|th)\s*period/i.test(str)) {
    const numMatch = str.match(/\d/);
    const num = numMatch ? numMatch[0] : "1";
    const periods: Record<string, string> = {
      "1": "09:00 AM - 10:00 AM",
      "2": "10:15 AM - 11:15 AM",
      "3": "11:30 AM - 12:30 PM",
      "4": "01:30 PM - 02:30 PM",
      "5": "02:45 PM - 03:45 PM"
    };
    return periods[num] || "09:00 AM - 10:00 AM";
  }

  return null;
}

function parseExcelSheet(grid: any[][]): { timetable: RoutineItem[], newSubjects: string[] } {
  const items: RoutineItem[] = [];
  const newSubjectsSet = new Set<string>();

  if (!grid || grid.length === 0) return { timetable: [], newSubjects: [] };

  // Heuristic 1: Columns are Days, Left is Times
  let dayCols: { [colIndex: number]: DayType } = {};
  let timeColIndex = -1;
  let headerRowIndex = -1;

  for (let r = 0; r < Math.min(grid.length, 10); r++) {
    const row = grid[r];
    if (!row) continue;
    const daysInRow: { [colIndex: number]: DayType } = {};

    for (let c = 0; c < row.length; c++) {
      const cellVal = row[c];
      const detectedDay = detectDay(cellVal);
      if (detectedDay) {
        daysInRow[c] = detectedDay;
      }
    }

    if (Object.keys(daysInRow).length >= 2) {
      dayCols = daysInRow;
      headerRowIndex = r;

      for (let c = 0; c < row.length; c++) {
        if (!daysInRow[c]) {
          let timeCount = 0;
          for (let checkR = r; checkR < Math.min(grid.length, r + 5); checkR++) {
            if (grid[checkR] && normalizeTimeSlot(grid[checkR][c])) {
              timeCount++;
            }
          }
          if (timeCount > 0) {
            timeColIndex = c;
            break;
          }
        }
      }
      if (timeColIndex === -1) {
        timeColIndex = 0;
      }
      break;
    }
  }

  if (Object.keys(dayCols).length >= 2 && headerRowIndex !== -1) {
    for (let r = headerRowIndex + 1; r < grid.length; r++) {
      const row = grid[r];
      if (!row) continue;

      const rawTime = row[timeColIndex];
      const timeSlot = normalizeTimeSlot(rawTime) || `Period ${r - headerRowIndex}`;

      for (const colIdxStr of Object.keys(dayCols)) {
        const colIdx = parseInt(colIdxStr, 10);
        const cellVal = row[colIdx];
        if (cellVal && String(cellVal).trim()) {
          const cellText = String(cellVal).trim();
          if (cellText.toLowerCase().includes("timetable") || cellText.toLowerCase().includes("lunch") || cellText.toLowerCase().includes("recess") || cellText.toLowerCase().includes("break") || cellText.toLowerCase().includes("period")) {
            continue;
          }

          const { subject, room } = parseSubjectAndRoom(cellText);
          if (subject && subject.length > 2) {
            newSubjectsSet.add(subject);
            items.push({
              id: `xlsx-${Math.random().toString(36).substring(7)}`,
              day: dayCols[colIdx],
              time: timeSlot,
              subjectId: subject, // mapped to ID later
              room: room || "TBD"
            });
          }
        }
      }
    }
  } else {
    // Heuristic 2: Column 0 has Days, Header has Times
    let dayRows: { [rowIndex: number]: DayType } = {};
    let timeCols: { [colIndex: number]: string } = {};

    for (let r = 0; r < grid.length; r++) {
      const row = grid[r];
      if (!row) continue;
      const detectedDay = detectDay(row[0]);
      if (detectedDay) {
        dayRows[r] = detectedDay;
      }
    }

    if (Object.keys(dayRows).length >= 2) {
      let timeHeaderIdx = -1;
      for (let r = 0; r < grid.length; r++) {
        const row = grid[r];
        if (!row) continue;
        let timesCount = 0;
        for (let c = 1; c < row.length; c++) {
          if (normalizeTimeSlot(row[c])) {
            timesCount++;
          }
        }
        if (timesCount >= 1) {
          timeHeaderIdx = r;
          for (let c = 1; c < row.length; c++) {
            if (row[c]) {
              timeCols[c] = normalizeTimeSlot(row[c]) || String(row[c]);
            }
          }
          break;
        }
      }

      for (const rowIdxStr of Object.keys(dayRows)) {
        const r = parseInt(rowIdxStr, 10);
        const row = grid[r];
        if (!row) continue;
        const day = dayRows[r];

        for (let c = 1; c < row.length; c++) {
          const cellVal = row[c];
          if (cellVal && String(cellVal).trim()) {
            const cellText = String(cellVal).trim();
            if (cellText.toLowerCase().includes("lunch") || cellText.toLowerCase().includes("recess") || cellText.toLowerCase().includes("break")) {
              continue;
            }

            const timeSlot = timeCols[c] || `Period ${c}`;
            const { subject, room } = parseSubjectAndRoom(cellText);
            if (subject && subject.length > 2) {
              newSubjectsSet.add(subject);
              items.push({
                id: `xlsx-${Math.random().toString(36).substring(7)}`,
                day,
                time: timeSlot,
                subjectId: subject,
                room: room || "TBD"
              });
            }
          }
        }
      }
    } else {
      // Heuristic 3: Fallback unstructured scanner
      let currentDay: DayType = "Monday";
      let currentTime = "09:00 AM - 10:00 AM";

      for (let r = 0; r < grid.length; r++) {
        const row = grid[r];
        if (!row) continue;

        for (let c = 0; c < row.length; c++) {
          const cellVal = row[c];
          if (!cellVal) continue;

          const detectedDay = detectDay(cellVal);
          if (detectedDay) {
            currentDay = detectedDay;
            continue;
          }

          const detectedTime = normalizeTimeSlot(cellVal);
          if (detectedTime) {
            currentTime = detectedTime;
            continue;
          }

          const cellText = String(cellVal).trim();
          if (cellText.length > 3 && isNaN(Number(cellText))) {
            if (cellText.toLowerCase().includes("timetable") || cellText.toLowerCase().includes("lunch") || cellText.toLowerCase().includes("break") || cellText.toLowerCase().includes("period")) {
              continue;
            }

            const { subject, room } = parseSubjectAndRoom(cellText);
            if (subject && subject.length > 2) {
              newSubjectsSet.add(subject);
              items.push({
                id: `xlsx-${Math.random().toString(36).substring(7)}`,
                day: currentDay,
                time: currentTime,
                subjectId: subject,
                room: room || "TBD"
              });
            }
          }
        }
      }
    }
  }

  return {
    timetable: items,
    newSubjects: Array.from(newSubjectsSet)
  };
}

export default function AttendanceScreen({
  onNavigate,
  subjects,
  setSubjects,
  overallPercent
}: AttendanceScreenProps) {
  // Navigation tabs within module
  const [activeTab, setActiveTab] = useState<"dashboard" | "routine" | "marking" | "reports">("dashboard");

  // Visual Theme state
  const [isLightTheme, setIsLightTheme] = useState<boolean>(() => {
    return localStorage.getItem("studentos_attendance_theme") === "light";
  });

  // Main Timetable / Routine State — starts empty, loads only real saved data
  const [timetable, setTimetable] = useState<RoutineItem[]>(() => {
    const stored = localStorage.getItem("studentos_timetable");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) { }
    }
    return [];
  });

  // Attendance Logs state — starts empty for every user, no fake seed data
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>(() => {
    const stored = localStorage.getItem("studentos_attendance_logs");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) { }
    }
    return [];
  });

  // States for marking UI date selection & filters — default to today, not a hardcoded date
  const [selectedMarkingDate, setSelectedMarkingDate] = useState<string>(getTodayStr());
  const [reportsSubjectFilter, setReportsSubjectFilter] = useState<string>("all");
  const [reportsStatusFilter, setReportsStatusFilter] = useState<string>("all");
  const [reportsMonthFilter, setReportsMonthFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // States for calendar view — default to current month/year
  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState<number>(today.getMonth());
  const [calendarYear, setCalendarYear] = useState<number>(today.getFullYear());
  const [calendarSubjectFilter, setCalendarSubjectFilter] = useState<string>("all");

  // Routine uploading & AI scanning states
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");

  // Modals
  const [showAddSubjectModal, setShowAddSubjectModal] = useState<boolean>(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [targetPercentage, setTargetPercentage] = useState(75);

  const [showAddRoutineModal, setShowAddRoutineModal] = useState<boolean>(false);
  const [newRoutineDay, setNewRoutineDay] = useState<"Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday">("Monday");
  const [newRoutineSubjectId, setNewRoutineSubjectId] = useState<string>("");
  const [newRoutineTime, setNewRoutineTime] = useState<string>("09:00 AM - 10:00 AM");
  const [newRoutineRoom, setNewRoutineRoom] = useState<string>("");

  // Day popover for calendar
  const [selectedDayDetail, setSelectedDayDetail] = useState<{ dateString: string; logs: AttendanceLog[] } | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Persist state + sync parent subject counts
  useEffect(() => {
    localStorage.setItem("studentos_timetable", JSON.stringify(timetable));
  }, [timetable]);

  useEffect(() => {
    localStorage.setItem("studentos_attendance_logs", JSON.stringify(attendanceLogs));
    localStorage.setItem("studentos_attendance_theme", isLightTheme ? "light" : "dark");

    const updatedSubjects = subjects.map((sub) => {
      const subLogs = attendanceLogs.filter((l) => l.subjectId === sub.id);
      const present = subLogs.filter((l) => l.status === "Present").length;
      const absent = subLogs.filter((l) => l.status === "Absent").length;
      return {
        ...sub,
        present,
        absent,
        late: 0
      };
    });

    const hasChanged = JSON.stringify(updatedSubjects) !== JSON.stringify(subjects);
    if (hasChanged) {
      setSubjects(updatedSubjects);
    }
  }, [attendanceLogs, isLightTheme]);

  // Handler for marking attendance
  const logAttendance = (date: string, subjectId: string, status: "Present" | "Absent" | "Holiday", timeSlot: string = "09:00 AM - 10:00 AM", room: string = "Room 301") => {
    setAttendanceLogs((prev) => {
      const existingIdx = prev.findIndex(
        (l) => l.date === date && l.subjectId === subjectId && l.timeSlot === timeSlot
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], status };
        return updated;
      } else {
        return [
          ...prev,
          {
            id: `manual-${Math.random().toString(36).substring(7)}`,
            date,
            subjectId,
            status,
            timeSlot,
            room
          }
        ];
      }
    });
  };

  const deleteLog = (id: string) => {
    setAttendanceLogs((prev) => prev.filter((l) => l.id !== id));
  };

  const deleteRoutineSlot = (id: string) => {
    setTimetable((prev) => prev.filter((item) => item.id !== id));
  };

  const deleteSubject = (subjectId: string, subjectName: string) => {
    setDeleteConfirm({ id: subjectId, name: subjectName });
  };

  const handleAddRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoutineSubjectId) return;

    const newItem: RoutineItem = {
      id: `rout-${Math.random().toString(36).substring(7)}`,
      day: newRoutineDay,
      time: newRoutineTime,
      subjectId: newRoutineSubjectId,
      room: newRoutineRoom || "TBD"
    };

    setTimetable((prev) => [...prev, newItem]);
    setNewRoutineRoom("");
    setShowAddRoutineModal(false);
  };

  // Timetable scanner: supports Excel worksheets (.xlsx, .xls, .csv), and image/PDF (manual entry fallback)
  const handleRoutineFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadedFileName(file.name);
    setIsScanning(true);
    setScanProgress(0);

    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv");

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const grid = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

          const parsed = parseExcelSheet(grid);

          const matchedItems: RoutineItem[] = [];
          const subjectsToAdd: { id: string, name: string }[] = [];

          parsed.newSubjects.forEach((subjectName) => {
            const normName = subjectName.trim().toLowerCase();
            const existing = subjects.find(s => s.name.trim().toLowerCase() === normName || s.name.trim().toLowerCase().includes(normName) || normName.includes(s.name.trim().toLowerCase()));
            if (!existing) {
              subjectsToAdd.push({
                id: Math.random().toString(36).substring(7),
                name: subjectName.trim()
              });
            }
          });

          if (subjectsToAdd.length > 0) {
            setSubjects((prev) => {
              const updated = [...prev];
              subjectsToAdd.forEach((newSub) => {
                if (!updated.some(s => s.name.toLowerCase() === newSub.name.toLowerCase())) {
                  updated.push({
                    id: newSub.id,
                    name: newSub.name,
                    present: 0,
                    absent: 0,
                    late: 0,
                    targetPercent: 75
                  });
                }
              });
              return updated;
            });
          }

          parsed.timetable.forEach((item) => {
            const normSubjectName = item.subjectId.trim().toLowerCase();
            const matchedSub = [...subjects, ...subjectsToAdd].find(
              s => s.name.trim().toLowerCase() === normSubjectName ||
                   s.name.trim().toLowerCase().includes(normSubjectName) ||
                   normSubjectName.includes(s.name.trim().toLowerCase())
            );

            if (matchedSub) {
              matchedItems.push({
                id: item.id,
                day: item.day,
                time: item.time,
                subjectId: matchedSub.id,
                room: item.room
              });
            }
          });

          let progress = 0;
          const interval = setInterval(() => {
            progress += 10;
            setScanProgress(progress);
            if (progress >= 100) {
              clearInterval(interval);
              setIsScanning(false);
              if (matchedItems.length > 0) {
                setTimetable((prev) => [...prev, ...matchedItems]);
              } else {
                alert("We couldn't extract any structured routine blocks from this file. Please check the format or add your schedule manually using 'Create Schedule Slot'.");
              }
            }
          }, 100);

        } catch (err: any) {
          console.error("Excel processing failed:", err);
          setIsScanning(false);
          alert(`Error parsing file: ${err?.message || err}.`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // For image/PDF uploads, we don't have real OCR wired up yet — tell the user honestly
      // instead of injecting simulated/fake subjects and schedule data.
      setIsScanning(false);
      setScanProgress(0);
      alert("Image and PDF scanning isn't available yet. Please upload an Excel/CSV timetable, or use 'Create Schedule Slot' to add classes manually.");
      e.target.value = "";
    }
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    const newSub: SubjectAttendance = {
      id: Math.random().toString(36).substring(7),
      name: newSubjectName,
      present: 0,
      absent: 0,
      late: 0,
      targetPercent: targetPercentage
    };

    setSubjects((prev) => [...prev, newSub]);
    setNewSubjectName("");
    setTargetPercentage(75);
    setShowAddSubjectModal(false);
  };

  // Reset clears everything back to a truly empty state (no demo data reinjected)
 // Reset clears everything back to a truly empty state (no demo data reinjected)
  const resetToDefaults = () => {
    if (window.confirm("This will permanently clear your subjects, timetable, and attendance records. Are you sure?")) {
      localStorage.removeItem("studentos_timetable");
      localStorage.removeItem("studentos_attendance_logs");
      setTimetable([]);
      setAttendanceLogs([]);
      setSubjects([]); // ← was missing — this is what actually zeroes out the 85%/93 numbers
    }
  };

  const getSubjectStats = (subjectId: string) => {
    const subLogs = attendanceLogs.filter((l) => l.subjectId === subjectId);
    const present = subLogs.filter((l) => l.status === "Present").length;
    const absent = subLogs.filter((l) => l.status === "Absent").length;
    const holiday = subLogs.filter((l) => l.status === "Holiday").length;
    const total = present + absent;

    const percentage = total === 0 ? 0 : Math.round((present / total) * 100);
    return { present, absent, holiday, total, percentage };
  };

  const totalHolidaysCount = attendanceLogs.filter((l) => l.status === "Holiday").length;
  const totalPresentCount = attendanceLogs.filter((l) => l.status === "Present").length;
  const totalAbsentCount = attendanceLogs.filter((l) => l.status === "Absent").length;
  const academicTotalClasses = totalPresentCount + totalAbsentCount;
  const currentOverallPercentage = academicTotalClasses === 0 ? 0 : Math.round((totalPresentCount / academicTotalClasses) * 100);

  const getDynamicAdvisory = () => {
    if (subjects.length === 0) {
      return "Add your first subject to start tracking attendance and get personalized eligibility guidance here.";
    }
    const criticalList = subjects.map(s => ({ name: s.name, stats: getSubjectStats(s.id) }))
                                .filter(s => s.stats.total > 0 && s.stats.percentage < 75);

    if (criticalList.length === 0) {
      return academicTotalClasses === 0
        ? "No attendance logged yet. Start marking your classes to see live compliance insights here."
        : "Excellent! All course profiles comfortably satisfy the university's 75% compliance threshold. Maintain this rhythm.";
    }
    const criticalNames = criticalList.map((c) => c.name).join(", ");
    return `Warning: Attendance in [ ${criticalNames} ] is currently below the 75% required mark. We advise marking future scheduled sessions as Present to avoid academic eligibility penalties.`;
  };

  const getCalendarCells = () => {
    const startDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    const cells = [];
    const prevMonthDays = new Date(calendarYear, calendarMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevMonth = calendarMonth === 0 ? 11 : calendarMonth - 1;
      const prevYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
      const mStr = String(prevMonth + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      cells.push({
        day: d,
        isCurrentMonth: false,
        dateString: `${prevYear}-${mStr}-${dStr}`
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const mStr = String(calendarMonth + 1).padStart(2, "0");
      const dStr = String(i).padStart(2, "0");
      cells.push({
        day: i,
        isCurrentMonth: true,
        dateString: `${calendarYear}-${mStr}-${dStr}`
      });
    }

    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = calendarMonth === 11 ? 0 : calendarMonth + 1;
      const nextYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
      const mStr = String(nextMonth + 1).padStart(2, "0");
      const dStr = String(i).padStart(2, "0");
      cells.push({
        day: i,
        isCurrentMonth: false,
        dateString: `${nextYear}-${mStr}-${dStr}`
      });
    }

    return cells;
  };

  const filteredLogsList = attendanceLogs.filter((log) => {
    const sub = subjects.find((s) => s.id === log.subjectId);
    const subName = sub ? sub.name.toLowerCase() : "";
    const matchesSearch = subName.includes(searchTerm.toLowerCase()) || log.room.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = reportsSubjectFilter === "all" || log.subjectId === reportsSubjectFilter;
    const matchesStatus = reportsStatusFilter === "all" || log.status === reportsStatusFilter;

    let matchesMonth = true;
    if (reportsMonthFilter !== "all") {
      const logMonth = log.date.split("-")[1];
      matchesMonth = logMonth === reportsMonthFilter;
    }

    return matchesSearch && matchesSubject && matchesStatus && matchesMonth;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const exportToCsv = () => {
    const headers = ["Log ID", "Date", "Subject", "Time Slot", "Lecture Room", "Attendance Status"];
    const rows = filteredLogsList.map((l) => {
      const sub = subjects.find((s) => s.id === l.subjectId);
      return [l.id, l.date, sub ? sub.name : "Unknown", l.timeSlot, l.room, l.status];
    });

    const csvContent = [headers, ...rows].map((e) => e.map((val) => `"${val}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `StudentOS_Attendance_Ledger_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printReport = () => {
    window.print();
  };

  // Weekly stats now computed relative to the real current date, not a fixed hardcoded week
  const getWeeklyStats = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    const prevMonday = new Date(monday);
    prevMonday.setDate(monday.getDate() - 7);
    const prevFriday = new Date(prevMonday);
    prevFriday.setDate(prevMonday.getDate() + 4);

    const toStr = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };

    const weekStart = toStr(monday);
    const weekEnd = toStr(friday);
    const prevWeekStart = toStr(prevMonday);
    const prevWeekEnd = toStr(prevFriday);

    const currentWeekLogs = attendanceLogs.filter((l) => l.date >= weekStart && l.date <= weekEnd);
    const present = currentWeekLogs.filter((l) => l.status === "Present").length;
    const absent = currentWeekLogs.filter((l) => l.status === "Absent").length;
    const holiday = currentWeekLogs.filter((l) => l.status === "Holiday").length;
    const total = present + absent;
    const percentage = total === 0 ? 0 : Math.round((present / total) * 100);

    const prevWeekLogs = attendanceLogs.filter((l) => l.date >= prevWeekStart && l.date <= prevWeekEnd);
    const prevPresent = prevWeekLogs.filter((l) => l.status === "Present").length;
    const prevTotal = prevPresent + prevWeekLogs.filter((l) => l.status === "Absent").length;
    const prevPercentage = prevTotal === 0 ? 0 : Math.round((prevPresent / prevTotal) * 100);

    const weekDays: { name: string; date: string }[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDays.push({ name: ["M", "T", "W", "T", "F"][i], date: toStr(d) });
    }

    return { present, absent, holiday, total, percentage, prevPercentage, weekStart, weekEnd, weekDays };
  };

  const textPrimary = isLightTheme ? "text-slate-900" : "text-white";
  const textSecondary = isLightTheme ? "text-slate-600" : "text-slate-400";
  const bgMain = isLightTheme ? "bg-[#F8FAFC]" : "bg-slate-950";
  const bgCard = isLightTheme ? "bg-white border-slate-200/80 shadow-sm" : "bg-slate-900/40 border-slate-900";
  const bgInput = isLightTheme ? "bg-white border-slate-200 text-slate-900" : "bg-slate-950 border-slate-900 text-white";

  const weeklyStats = getWeeklyStats();
  const todayStr = getTodayStr();

  return (
    <div className={`flex h-screen overflow-hidden ${bgMain} ${isLightTheme ? "" : "grid-bg"}`}>
      {/* Sidebar Navigation */}
      <Sidebar currentScreen="attendance" onNavigate={onNavigate} />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10 font-sans transition-colors duration-200">
        {/* Top Sticky Header */}
        <header className={`p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between border-b ${isLightTheme ? "border-slate-200/60 bg-white" : "border-slate-900/40 bg-slate-950/80"} sticky top-0 z-30 backdrop-blur-md`}>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-indigo-500 font-mono tracking-widest uppercase bg-indigo-500/10 px-2 py-0.5 rounded-full">
                ATTENDANCE
              </span>
              <button
                onClick={resetToDefaults}
                className="text-[10px] font-bold text-slate-400 font-mono flex items-center hover:text-rose-400 transition-colors cursor-pointer"
                title="Clear all timetable and attendance data"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear All Data
              </button>
            </div>
            <h1 className={`text-2xl font-black ${textPrimary} mt-1 tracking-tight`}>
              Attendance
            </h1>
            <p className={`text-xs ${textSecondary} mt-0.5`}>
              Track eligibility percentages, build your timetable, and log daily attendance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4 sm:mt-0">
            {/* Theme Toggle Widget */}
            <button
              onClick={() => setIsLightTheme(!isLightTheme)}
              className={`p-2 rounded-xl border ${isLightTheme ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200" : "bg-slate-900/80 border-slate-850 text-slate-300 hover:bg-slate-800"} transition-all cursor-pointer`}
              title={isLightTheme ? "Switch to dark theme" : "Switch to light theme"}
            >
              {isLightTheme ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
            </button>

            {/* Quick Add Buttons */}
            <button
              onClick={() => setShowAddSubjectModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center space-x-1.5 shadow-lg shadow-indigo-600/15 cursor-pointer transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Add Subject</span>
            </button>
          </div>
        </header>

        {/* Sub-Navigation Rail */}
        <div className={`px-6 py-3 border-b ${isLightTheme ? "border-slate-200/50 bg-white" : "border-slate-900/30"} flex space-x-1 overflow-x-auto shrink-0 sticky top-[73px] z-20 backdrop-blur-sm`}>
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center space-x-2 border ${
              activeTab === "dashboard"
                ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20 shadow-sm"
                : `${isLightTheme ? "text-slate-600 border-transparent hover:bg-slate-100" : "text-slate-400 border-transparent hover:bg-slate-900/60"}`
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab("routine")}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center space-x-2 border ${
              activeTab === "routine"
                ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20 shadow-sm"
                : `${isLightTheme ? "text-slate-600 border-transparent hover:bg-slate-100" : "text-slate-400 border-transparent hover:bg-slate-900/60"}`
            }`}
          >
            <CalendarIcon className="h-4 w-4" />
            <span>Timetable & Routine</span>
          </button>
          <button
            onClick={() => setActiveTab("marking")}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center space-x-2 border ${
              activeTab === "marking"
                ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20 shadow-sm"
                : `${isLightTheme ? "text-slate-600 border-transparent hover:bg-slate-100" : "text-slate-400 border-transparent hover:bg-slate-900/60"}`
            }`}
          >
            <CheckCircle className="h-4 w-4" />
            <span>Attendance Roll Call</span>
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center space-x-2 border ${
              activeTab === "reports"
                ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20 shadow-sm"
                : `${isLightTheme ? "text-slate-600 border-transparent hover:bg-slate-100" : "text-slate-400 border-transparent hover:bg-slate-900/60"}`
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Reports</span>
          </button>
        </div>

        {/* Tab Views */}
        <div className="p-6 space-y-8 flex-1">
          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-fade-in">
              {subjects.length === 0 ? (
                <div className={`p-10 rounded-2xl border ${bgCard} text-center space-y-4`}>
                  <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
                    <LayoutDashboard className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className={`text-base font-extrabold ${textPrimary}`}>No subjects yet</h3>
                    <p className={`text-xs ${textSecondary} mt-1 max-w-sm mx-auto`}>
                      Add your first subject to start tracking attendance, build a timetable, and see your compliance stats here.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddSubjectModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-5 rounded-xl inline-flex items-center space-x-1.5 cursor-pointer transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Your First Subject</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Top Overview Cards row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className={`p-5 rounded-2xl border ${bgCard} flex items-center justify-between`}>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Compliance Rate</span>
                        <span className={`text-2xl font-black ${textPrimary} mt-1 block font-mono`}>{currentOverallPercentage}%</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          academicTotalClasses === 0 ? "bg-slate-500/10 text-slate-400" : currentOverallPercentage >= 75 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                        } mt-2 inline-block font-mono`}>
                          {academicTotalClasses === 0 ? "No data yet" : currentOverallPercentage >= 75 ? "Eligible" : "Below Cutoff (75%)"}
                        </span>
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                    </div>

                    <div className={`p-5 rounded-2xl border ${bgCard} flex items-center justify-between`}>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Academic Classes</span>
                        <span className={`text-2xl font-black ${textPrimary} mt-1 block font-mono`}>{academicTotalClasses}</span>
                        <span className={`text-[10px] ${textSecondary} mt-2 block`}>excluding holidays</span>
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                    </div>

                    <div className={`p-5 rounded-2xl border ${bgCard} flex items-center justify-between`}>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Attended Sessions</span>
                        <span className={`text-2xl font-black text-emerald-500 mt-1 block font-mono`}>{totalPresentCount}</span>
                        <span className={`text-[10px] text-emerald-400/80 font-semibold mt-2 block`}>Present status</span>
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                    </div>

                    <div className={`p-5 rounded-2xl border ${bgCard} flex items-center justify-between`}>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Absent Sessions</span>
                        <span className={`text-2xl font-black text-rose-500 mt-1 block font-mono`}>{totalAbsentCount}</span>
                        <span className={`text-[10px] text-rose-400/80 font-semibold mt-2 block`}>Eligibility impact</span>
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                    </div>

                    <div className={`p-5 rounded-2xl border ${bgCard} flex items-center justify-between`}>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Holidays</span>
                        <span className={`text-2xl font-black text-amber-500 mt-1 block font-mono`}>{totalHolidaysCount}</span>
                        <span className={`text-[10px] text-amber-400/80 font-semibold mt-2 block`}>Marked / scheduled</span>
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                        <CalendarIcon className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  {/* Circular Progress & Advisor */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className={`p-6 rounded-2xl border ${bgCard} flex flex-col items-center justify-center text-center`}>
                      <h3 className={`text-xs font-bold tracking-wider ${textSecondary} uppercase font-mono mb-6`}>Standing Gauge</h3>

                      <div className="relative flex items-center justify-center">
                        <svg className="w-36 h-36 transform -rotate-90">
                          <circle cx="72" cy="72" r="60" stroke={isLightTheme ? "rgba(226, 232, 240, 1)" : "rgba(30, 41, 59, 0.5)"} strokeWidth="12" fill="transparent" />
                          <circle
                            cx="72" cy="72" r="60"
                            stroke="url(#gradient-erp)"
                            strokeWidth="12"
                            fill="transparent"
                            strokeDasharray={376.8}
                            strokeDashoffset={376.8 - (376.8 * currentOverallPercentage) / 100}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                          />
                          <defs>
                            <linearGradient id="gradient-erp" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#4f46e5" />
                              <stop offset="100%" stopColor="#9333ea" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute text-center">
                          <span className={`block text-3xl font-black font-mono tracking-tight ${textPrimary}`}>{currentOverallPercentage}%</span>
                          <span className="text-[9px] uppercase font-bold text-indigo-500 font-mono">Present Rate</span>
                        </div>
                      </div>

                      <div className={`flex items-center space-x-2 text-xs ${textSecondary} mt-6 px-4 py-1.5 rounded-xl bg-indigo-500/5 border ${isLightTheme ? "border-slate-100" : "border-slate-900"}`}>
                        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Academic Cutoff: 75% required</span>
                      </div>
                    </div>

                    {/* Weekly Summary */}
                    <div className={`p-6 rounded-2xl border ${bgCard} flex flex-col justify-between`}>
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                              <Clock className="h-4 w-4 text-indigo-400" />
                            </div>
                            <h3 className="text-xs font-bold tracking-wider text-indigo-500 uppercase font-mono">Weekly Summary</h3>
                          </div>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-slate-155 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded text-slate-400">
                            {weeklyStats.weekStart} to {weeklyStats.weekEnd}
                          </span>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-baseline justify-between">
                            <div>
                              <span className={`text-2xl font-black ${textPrimary} font-mono block`}>{weeklyStats.percentage}%</span>
                              <span className="text-[10px] text-slate-400">Weekly Present Rate</span>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs font-bold font-mono flex items-center justify-end ${
                                weeklyStats.percentage >= weeklyStats.prevPercentage ? "text-emerald-500" : "text-rose-500"
                              }`}>
                                {weeklyStats.percentage >= weeklyStats.prevPercentage ? "▲" : "▼"} {Math.abs(weeklyStats.percentage - weeklyStats.prevPercentage)}%
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono">vs previous week ({weeklyStats.prevPercentage}%)</span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">Weekly Timeline Ledger</span>
                            <div className="grid grid-cols-5 gap-1 text-center font-mono text-[9px]">
                              {weeklyStats.weekDays.map((day) => {
                                const dayLogs = attendanceLogs.filter(l => l.date === day.date);
                                const hasAbsent = dayLogs.some(l => l.status === "Absent");
                                const hasHoliday = dayLogs.every(l => l.status === "Holiday") && dayLogs.length > 0;
                                const isLogged = dayLogs.length > 0;

                                let dotBg = "bg-slate-200 dark:bg-slate-800 text-slate-400";
                                if (isLogged) {
                                  if (hasHoliday) dotBg = "bg-amber-500/10 text-amber-500 border border-amber-500/20";
                                  else if (hasAbsent) dotBg = "bg-rose-500/10 text-rose-500 border border-rose-500/20";
                                  else dotBg = "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
                                }

                                return (
                                  <div key={day.date} className={`p-1.5 rounded-lg flex flex-col items-center justify-center ${dotBg}`} title={`Date: ${day.date}, Classes: ${dayLogs.length}`}>
                                    <span className="font-black text-[10px]">{day.name}</span>
                                    <span className="text-[8px] mt-0.5 opacity-85">
                                      {isLogged ? (hasHoliday ? "H" : hasAbsent ? "A" : "P") : "-"}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
                            <div className="flex items-center space-x-1.5">
                              <div className="h-2 w-2 rounded-full bg-emerald-500" />
                              <span>Present: {weeklyStats.present}</span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <div className="h-2 w-2 rounded-full bg-rose-500" />
                              <span>Absent: {weeklyStats.absent}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className={`pt-3 border-t ${isLightTheme ? "border-slate-100" : "border-slate-900/60"} text-[9px] text-slate-500 font-mono mt-4 text-center`}>
                        Auto calculated from your logged attendance
                      </div>
                    </div>

                    {/* Advisor */}
                    <div className={`p-6 rounded-2xl border ${bgCard} flex flex-col justify-between relative overflow-hidden bg-gradient-to-br ${
                      isLightTheme ? "from-indigo-50/50 to-white" : "from-indigo-500/5 to-transparent"
                    }`}>
                      <div className="absolute right-0 top-0 p-6 opacity-5">
                        <Sparkles className="h-28 w-28 text-indigo-400" />
                      </div>

                      <div>
                        <div className="flex items-center space-x-2.5 mb-3">
                          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                            <Sparkles className="h-4 w-4 text-indigo-400" />
                          </div>
                          <h3 className="text-xs font-bold tracking-wider text-indigo-500 uppercase font-mono">Attendance Advisor</h3>
                        </div>

                        <h4 className={`text-lg font-black ${textPrimary} leading-tight`}>
                          {academicTotalClasses === 0 ? "Get Started" : currentOverallPercentage >= 75 ? "Good Standing" : "Eligibility Alert"}
                        </h4>
                        <p className={`text-xs ${isLightTheme ? "text-slate-700" : "text-slate-300"} mt-3 leading-relaxed bg-slate-950/5 p-4 rounded-xl border ${isLightTheme ? "border-slate-200" : "border-slate-900"}`}>
                          {getDynamicAdvisory()}
                        </p>
                      </div>

                      <div className={`pt-4 border-t ${isLightTheme ? "border-slate-200/60" : "border-slate-900/60"} flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] ${textSecondary} font-mono mt-4`}>
                        <span>Schedules: {timetable.length} slots</span>
                        <span>Total Logs: {attendanceLogs.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Subject Breakdown cards */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-xs font-bold tracking-wider ${textSecondary} uppercase font-mono`}>Course Profiles & Ratios</h3>
                      <span className="text-[10px] text-indigo-500 font-mono">Target Threshold: 75%</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {subjects.map((sub) => {
                        const stats = getSubjectStats(sub.id);
                        const isBelow = stats.total > 0 && stats.percentage < 75;

                        return (
                          <div key={sub.id} className={`p-5 rounded-2xl border ${bgCard} flex flex-col justify-between min-h-[180px] hover:border-slate-500/30 transition-all`}>
                            <div>
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0 flex-1">
                                  <h4 className={`text-sm font-extrabold ${textPrimary} truncate`} title={sub.name}>{sub.name}</h4>
                                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">Academic Course ID: #{sub.id}</p>
                                </div>
                                <div className="flex items-center space-x-2 shrink-0">
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                                    stats.total === 0 ? "bg-slate-500/10 text-slate-400" : isBelow ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"
                                  }`}>
                                    Ratio: {stats.percentage}%
                                  </span>
                                  <button
                                    onClick={() => deleteSubject(sub.id, sub.name)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer flex items-center justify-center"
                                    title={`Delete subject "${sub.name}"`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="w-full bg-slate-200 dark:bg-slate-900 h-2.5 rounded-full mt-4 overflow-hidden border border-slate-100 dark:border-slate-850">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isBelow ? "bg-rose-500" : "bg-gradient-to-r from-indigo-500 to-purple-600"
                                  }`}
                                  style={{ width: `${Math.min(stats.percentage, 100)}%` }}
                                />
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-center mt-4">
                                <div className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-950/40 border ${isLightTheme ? "border-slate-150" : "border-slate-900"}`}>
                                  <span className="block text-xs font-bold font-mono text-emerald-500">{stats.present}</span>
                                  <span className="text-[8px] uppercase font-bold text-slate-400">Present</span>
                                </div>
                                <div className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-950/40 border ${isLightTheme ? "border-slate-150" : "border-slate-900"}`}>
                                  <span className="block text-xs font-bold font-mono text-rose-500">{stats.absent}</span>
                                  <span className="text-[8px] uppercase font-bold text-slate-400">Absent</span>
                                </div>
                                <div className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-950/40 border ${isLightTheme ? "border-slate-150" : "border-slate-900"}`}>
                                  <span className="block text-xs font-bold font-mono text-indigo-500">{stats.holiday}</span>
                                  <span className="text-[8px] uppercase font-bold text-slate-400">Holidays</span>
                                </div>
                              </div>
                            </div>

                            <div className={`flex space-x-2 pt-3 border-t ${isLightTheme ? "border-slate-100" : "border-slate-900/60"} mt-4`}>
                              <button
                                onClick={() => logAttendance(todayStr, sub.id, "Present")}
                                className="flex-1 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/10 text-[9px] font-extrabold uppercase tracking-widest font-mono cursor-pointer transition-all"
                              >
                                + Log Present
                              </button>
                              <button
                                onClick={() => logAttendance(todayStr, sub.id, "Absent")}
                                className="flex-1 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/10 text-[9px] font-extrabold uppercase tracking-widest font-mono cursor-pointer transition-all"
                              >
                                + Log Absent
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Monthly Calendar View */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className={`text-xs font-bold tracking-wider ${textSecondary} uppercase font-mono`}>Monthly Attendance Grid</h3>
                        <p className={`text-[11px] ${textSecondary} mt-0.5`}>Color-coded calendar. Click any cell to log daily attendance.</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-850">
                          <button
                            onClick={() => {
                              if (calendarMonth === 0) {
                                setCalendarMonth(11);
                                setCalendarYear(calendarYear - 1);
                              } else {
                                setCalendarMonth(calendarMonth - 1);
                              }
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <span className={`text-xs font-bold ${textPrimary} px-2 font-mono`}>
                            {new Date(calendarYear, calendarMonth).toLocaleString("default", { month: "long", year: "numeric" })}
                          </span>
                          <button
                            onClick={() => {
                              if (calendarMonth === 11) {
                                setCalendarMonth(0);
                                setCalendarYear(calendarYear + 1);
                              } else {
                                setCalendarMonth(calendarMonth + 1);
                              }
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>

                        <select
                          value={calendarSubjectFilter}
                          onChange={(e) => setCalendarSubjectFilter(e.target.value)}
                          className={`text-xs px-2.5 py-1.5 rounded-xl ${bgInput} focus:outline-none focus:border-indigo-500 font-mono cursor-pointer`}
                        >
                          <option value="all">All Subjects</option>
                          {subjects.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-slate-400 pb-2">
                      <div className="flex items-center space-x-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <span>Present</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                        <span>Absent</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                        <span>Holiday</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <div className="h-2.5 w-2.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-350 dark:border-slate-750" />
                        <span>Active Calendar Day</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-500/5 p-2 rounded-xl border border-indigo-500/10">
                      <div>Sun</div>
                      <div>Mon</div>
                      <div>Tue</div>
                      <div>Wed</div>
                      <div>Thu</div>
                      <div>Fri</div>
                      <div>Sat</div>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {getCalendarCells().map((cell, idx) => {
                        const cellLogs = attendanceLogs.filter((log) => {
                          if (log.date !== cell.dateString) return false;
                          if (calendarSubjectFilter !== "all" && log.subjectId !== calendarSubjectFilter) return false;
                          return true;
                        });

                        const presents = cellLogs.filter((l) => l.status === "Present");
                        const absents = cellLogs.filter((l) => l.status === "Absent");
                        const holidays = cellLogs.filter((l) => l.status === "Holiday");

                        const isCurrentDate = cell.dateString === todayStr;

                        return (
                          <div
                            key={`${cell.dateString}-${idx}`}
                            onClick={() => {
                              setSelectedDayDetail({
                                dateString: cell.dateString,
                                logs: cellLogs
                              });
                            }}
                            className={`min-h-[75px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                              cell.isCurrentMonth
                                ? isCurrentDate
                                  ? "bg-indigo-500/15 border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                                  : `${bgCard} hover:border-slate-500`
                                : `${isLightTheme ? "bg-slate-50 border-slate-100 text-slate-300" : "bg-slate-950/20 border-slate-950/60 text-slate-600"}`
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-[11px] font-bold font-mono ${
                                cell.isCurrentMonth ? textPrimary : "opacity-40"
                              }`}>
                                {cell.day}
                              </span>
                              {isCurrentDate && (
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" title="Today" />
                              )}
                            </div>

                            <div className="space-y-0.5 mt-2 overflow-hidden">
                              {presents.map((p) => (
                                <div key={p.id} className="h-1 w-full rounded bg-emerald-500" title={`Attended: ${subjects.find(s => s.id === p.subjectId)?.name}`} />
                              ))}
                              {absents.map((a) => (
                                <div key={a.id} className="h-1 w-full rounded bg-rose-500" title={`Missed: ${subjects.find(s => s.id === a.subjectId)?.name}`} />
                              ))}
                              {holidays.map((h) => (
                                <div key={h.id} className="h-1 w-full rounded bg-amber-500" title={`Holiday: ${subjects.find(s => s.id === h.subjectId)?.name}`} />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "routine" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <div className={`p-6 rounded-2xl border ${bgCard} space-y-6`}>
                  <div>
                    <h3 className={`text-sm font-extrabold ${textPrimary} tracking-tight flex items-center space-x-2`}>
                      <Sliders className="h-4.5 w-4.5 text-indigo-500" />
                      <span>Class Schedule Planner</span>
                    </h3>
                    <p className={`text-xs ${textSecondary} mt-1`}>
                      Define your weekly classes and classroom locations.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className={`text-[10px] font-bold ${textSecondary} uppercase font-mono`}>
                      Import Timetable (Excel/CSV)
                    </label>
                    <div className={`border-2 border-dashed ${
                      isLightTheme ? "border-slate-200 hover:border-indigo-500" : "border-slate-800 hover:border-indigo-500"
                    } rounded-xl p-4 text-center cursor-pointer relative transition-all`}>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleRoutineFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />

                      {isScanning ? (
                        <div className="space-y-2">
                          <Sparkles className="h-6 w-6 text-indigo-500 animate-spin mx-auto" />
                          <p className="text-xs font-bold text-white font-mono">Processing file...</p>
                          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono">Importing weekly time blocks</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className={`h-6 w-6 ${textSecondary} mx-auto`} />
                          <p className={`text-xs font-bold ${textPrimary}`}>Drag routine file or Browse</p>
                          <p className="text-[9px] text-slate-400 font-mono">Supports Excel (.xlsx, .xls) and CSV</p>
                        </div>
                      )}
                    </div>
                    {uploadedFileName && !isScanning && (
                      <p className="text-[10px] text-emerald-400 font-mono text-center flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Processed: {uploadedFileName}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (subjects.length === 0) {
                        alert("Please add at least one subject first.");
                        return;
                      }
                      setNewRoutineSubjectId(subjects[0].id);
                      setShowAddRoutineModal(true);
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center space-x-1.5 cursor-pointer transition-all"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    <span>Create Schedule Slot</span>
                  </button>

                  <div className={`p-4 rounded-xl bg-indigo-500/5 border ${isLightTheme ? "border-slate-100" : "border-slate-900"} text-[11px] ${textSecondary} leading-relaxed flex items-start space-x-2`}>
                    <Info className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                    <span>Timetable slots are used by the Roll Call and Calendar tabs to speed up marking attendance.</span>
                  </div>
                </div>

                {/* Weekly Roster Grid */}
                <div className={`lg:col-span-2 p-6 rounded-2xl border ${bgCard} space-y-6`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-sm font-extrabold ${textPrimary} tracking-tight`}>Weekly Roster Grid</h3>
                      <p className={`text-xs ${textSecondary} mt-0.5`}>Your recurring classes, Monday to Friday.</p>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full font-bold">
                      {timetable.length} Active Slots
                    </span>
                  </div>

                  {(() => {
                    if (!timetable || timetable.length === 0) {
                      return (
                        <div className="pt-2">
                          <EmptyState
                            onAddClick={() => {
                              if (subjects.length === 0) {
                                alert("Please add at least one subject first.");
                                return;
                              }
                              setNewRoutineSubjectId(subjects[0].id);
                              setShowAddRoutineModal(true);
                            }}
                          />
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const).map((day) => {
                          const daySlots = timetable.filter((item) => item.day === day);

                          return (
                            <div key={day} className="space-y-3">
                              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900/40 text-center border border-slate-200/50 dark:border-slate-900">
                                <span className={`text-[11px] font-extrabold ${textPrimary} tracking-wide`}>{day}</span>
                              </div>

                              <div className="space-y-2">
                                {daySlots.length === 0 ? (
                                  <p className="text-[10px] text-slate-500 italic text-center py-4">No lectures</p>
                                ) : (
                                  daySlots.map((slot) => {
                                    const sub = subjects.find((s) => s.id === slot.subjectId);
                                    return (
                                      <div
                                        key={slot.id}
                                        className={`p-3 rounded-xl border ${
                                          isLightTheme ? "bg-slate-50 border-slate-200 hover:border-slate-350" : "bg-slate-950/60 border-slate-900 hover:border-slate-800"
                                        } transition-all relative group flex flex-col justify-between`}
                                      >
                                        <div>
                                          <h4 className={`text-xs font-extrabold ${textPrimary} truncate`}>
                                            {sub ? sub.name : "Unmapped Subject"}
                                          </h4>
                                          <div className="flex items-center space-x-1 text-[9px] text-slate-400 mt-1 font-mono">
                                            <Clock className="h-3 w-3" />
                                            <span>{slot.time.split(" - ")[0]}</span>
                                          </div>
                                          <div className="text-[8px] font-bold text-indigo-500 tracking-wider font-mono uppercase mt-1">
                                            {slot.room}
                                          </div>
                                        </div>

                                        <button
                                          onClick={() => deleteRoutineSlot(slot.id)}
                                          className="absolute top-2 right-2 p-1 text-slate-500 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="Remove timetable slot"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

              </div>
            </div>
          )}

          {activeTab === "marking" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <div className={`p-6 rounded-2xl border ${bgCard} space-y-6`}>
                  <div>
                    <h3 className={`text-sm font-extrabold ${textPrimary} tracking-tight`}>Mark Attendance</h3>
                    <p className={`text-xs ${textSecondary} mt-1`}>Select a day to log attendance.</p>
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[10px] font-bold ${textSecondary} uppercase font-mono`}>Date</label>
                    <input
                      type="date"
                      value={selectedMarkingDate}
                      onChange={(e) => setSelectedMarkingDate(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl ${bgInput} focus:outline-none focus:border-indigo-500 text-sm font-sans`}
                    />
                  </div>
                  <button
                    onClick={() => setSelectedMarkingDate(todayStr)}
                    className={`w-full text-xs font-bold py-2 rounded-xl border ${isLightTheme ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100" : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"} transition-all cursor-pointer`}
                  >
                    Jump to Today
                  </button>

                  <div className="pt-4 border-t border-slate-800 space-y-3">
                    <h4 className={`text-xs font-bold ${textPrimary} uppercase font-mono`}>Quick Holiday Modifier</h4>
                    <p className={`text-[11px] ${textSecondary}`}>Declare this date as a holiday to auto-mark scheduled sessions.</p>
                    <button
                      onClick={() => {
                        const dateObj = new Date(selectedMarkingDate);
                        const daysArr = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
                        const dayName = daysArr[dateObj.getDay()];
                        const scheduledClasses = timetable.filter(item => item.day === dayName);

                        if (scheduledClasses.length === 0) {
                          alert(`There are no scheduled classes on ${dayName} (${selectedMarkingDate}). You can still log ad-hoc entries below!`);
                          return;
                        }

                        scheduledClasses.forEach(item => {
                          logAttendance(selectedMarkingDate, item.subjectId, "Holiday", item.time, item.room);
                        });
                        alert(`Marked ${selectedMarkingDate} (${dayName}) as holiday for ${scheduledClasses.length} scheduled sessions.`);
                      }}
                      className={`w-full border ${
                        isLightTheme ? "border-amber-300 hover:bg-amber-50 text-amber-600" : "border-amber-500/20 hover:bg-amber-500/10 text-amber-500"
                      } text-xs font-bold py-2 px-4 rounded-xl transition-all cursor-pointer text-center`}
                    >
                      Declare Holiday
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <div className={`p-6 rounded-2xl border ${bgCard}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                      <div>
                        <h3 className={`text-sm font-extrabold ${textPrimary} tracking-tight`}>
                          {new Date(selectedMarkingDate).toLocaleDateString("default", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                        </h3>
                        <p className={`text-xs ${textSecondary} mt-0.5`}>Classes scheduled from your timetable on this weekday.</p>
                      </div>

                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-indigo-500/10 rounded-full text-indigo-400">
                        {selectedMarkingDate}
                      </span>
                    </div>

                    {(() => {
                      const dateObj = new Date(selectedMarkingDate);
                      const daysArr = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
                      const dayName = daysArr[dateObj.getDay()];
                      const daySchedule = timetable.filter((item) => item.day === dayName);

                      if (daySchedule.length === 0) {
                        return (
                          <div className="text-center py-12 space-y-2">
                            <p className={`text-xs ${textSecondary} italic`}>No classes scheduled on {dayName}s.</p>
                            <p className="text-[10px] text-slate-500">Add schedule slots in the Timetable tab, or log an ad-hoc session below!</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {daySchedule.map((slot) => {
                            const sub = subjects.find((s) => s.id === slot.subjectId);
                            const log = attendanceLogs.find(
                              (l) => l.date === selectedMarkingDate && l.subjectId === slot.subjectId && l.timeSlot === slot.time
                            );

                            return (
                              <div
                                key={slot.id}
                                className={`p-4 rounded-xl border ${
                                  isLightTheme ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-900"
                                } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <h4 className={`text-xs font-extrabold ${textPrimary}`}>{sub ? sub.name : "Unmapped Subject"}</h4>
                                    <span className="text-[8px] font-bold text-indigo-400 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase">
                                      {slot.room}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono">
                                    <Clock className="h-3 w-3" />
                                    <span>{slot.time}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => logAttendance(selectedMarkingDate, slot.subjectId, "Present", slot.time, slot.room)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold font-mono uppercase tracking-wider transition-all border cursor-pointer ${
                                      log?.status === "Present"
                                        ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/10"
                                        : `${isLightTheme ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-100" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"}`
                                    }`}
                                  >
                                    Present
                                  </button>
                                  <button
                                    onClick={() => logAttendance(selectedMarkingDate, slot.subjectId, "Absent", slot.time, slot.room)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold font-mono uppercase tracking-wider transition-all border cursor-pointer ${
                                      log?.status === "Absent"
                                        ? "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/10"
                                        : `${isLightTheme ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-100" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"}`
                                    }`}
                                  >
                                    Absent
                                  </button>
                                  <button
                                    onClick={() => logAttendance(selectedMarkingDate, slot.subjectId, "Holiday", slot.time, slot.room)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold font-mono uppercase tracking-wider transition-all border cursor-pointer ${
                                      log?.status === "Holiday"
                                        ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/10"
                                        : `${isLightTheme ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-100" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"}`
                                    }`}
                                  >
                                    Holiday
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Ad-Hoc Session Logger */}
                  {subjects.length > 0 && (
                    <div className={`p-6 rounded-2xl border ${bgCard} space-y-4`}>
                      <div>
                        <h3 className={`text-sm font-extrabold ${textPrimary} tracking-tight`}>Log Unscheduled / Ad-Hoc Session</h3>
                        <p className={`text-xs ${textSecondary} mt-0.5`}>Attended a guest lecture or extra class? Log it here.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">Subject</label>
                          <select
                            id="adhoc-subject"
                            className={`w-full px-2.5 py-2 rounded-xl text-xs ${bgInput} focus:outline-none`}
                          >
                            {subjects.map((sub) => (
                              <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">Time Period</label>
                          <input
                            type="text"
                            id="adhoc-time"
                            defaultValue="04:00 PM - 05:00 PM"
                            placeholder="e.g. 04:00 PM - 05:00 PM"
                            className={`w-full px-2.5 py-2 rounded-xl text-xs ${bgInput} focus:outline-none`}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">Status</label>
                          <select
                            id="adhoc-status"
                            className={`w-full px-2.5 py-2 rounded-xl text-xs ${bgInput} focus:outline-none`}
                          >
                            <option value="Present">Present</option>
                            <option value="Absent">Absent</option>
                            <option value="Holiday">Holiday</option>
                          </select>
                        </div>

                        <button
                          onClick={() => {
                            const subSel = (document.getElementById("adhoc-subject") as HTMLSelectElement).value;
                            const timeVal = (document.getElementById("adhoc-time") as HTMLInputElement).value;
                            const statSel = (document.getElementById("adhoc-status") as HTMLSelectElement).value as any;

                            logAttendance(selectedMarkingDate, subSel, statSel, timeVal, "Seminar Hall");
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-xl transition-all cursor-pointer text-center"
                        >
                          Log Session
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="space-y-6 animate-fade-in">
              <div className={`p-6 rounded-2xl border ${bgCard} space-y-6`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className={`text-sm font-extrabold ${textPrimary} tracking-tight`}>Attendance Ledger</h3>
                    <p className={`text-xs ${textSecondary} mt-0.5`}>Browse your logged records and export or print reports.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={exportToCsv}
                      className={`text-xs font-bold py-2 px-3 rounded-xl border ${
                        isLightTheme ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100" : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                      } flex items-center space-x-1.5 cursor-pointer transition-all`}
                    >
                      <Download className="h-4 w-4" />
                      <span>Export CSV</span>
                    </button>
                    <button
                      onClick={printReport}
                      className={`text-xs font-bold py-2 px-3 rounded-xl border ${
                        isLightTheme ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100" : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                      } flex items-center space-x-1.5 cursor-pointer transition-all`}
                    >
                      <Printer className="h-4 w-4" />
                      <span>Print Page</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-900">

                  <div className="space-y-1">
                    <label className={`text-[10px] font-bold ${textSecondary} uppercase font-mono`}>Search</label>
                    <input
                      type="text"
                      placeholder="e.g. subject, room..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-xl text-xs ${bgInput} focus:outline-none focus:border-indigo-500`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[10px] font-bold ${textSecondary} uppercase font-mono`}>Subject</label>
                    <select
                      value={reportsSubjectFilter}
                      onChange={(e) => setReportsSubjectFilter(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-xl text-xs ${bgInput} focus:outline-none cursor-pointer`}
                    >
                      <option value="all">All Subjects</option>
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[10px] font-bold ${textSecondary} uppercase font-mono`}>Status</label>
                    <select
                      value={reportsStatusFilter}
                      onChange={(e) => setReportsStatusFilter(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-xl text-xs ${bgInput} focus:outline-none cursor-pointer`}
                    >
                      <option value="all">All Statuses</option>
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="Holiday">Holiday</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[10px] font-bold ${textSecondary} uppercase font-mono`}>Month</label>
                    <select
                      value={reportsMonthFilter}
                      onChange={(e) => setReportsMonthFilter(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-xl text-xs ${bgInput} focus:outline-none cursor-pointer`}
                    >
                      <option value="all">All Months</option>
                      {Array.from({ length: 12 }, (_, i) => {
                        const mm = String(i + 1).padStart(2, "0");
                        const label = new Date(2000, i, 1).toLocaleString("default", { month: "long" });
                        return <option key={mm} value={mm}>{label}</option>;
                      })}
                    </select>
                  </div>

                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-900">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-850 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                      <tr>
                        <th className="p-4">Date</th>
                        <th className="p-4">Subject</th>
                        <th className="p-4">Time Slot</th>
                        <th className="p-4">Room</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-900">
                      {filteredLogsList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-500 italic">
                            {attendanceLogs.length === 0
                              ? "No attendance logged yet. Head to the Roll Call tab to get started."
                              : "No results found matching current filters."}
                          </td>
                        </tr>
                      ) : (
                        filteredLogsList.map((log) => {
                          const sub = subjects.find((s) => s.id === log.subjectId);

                          return (
                            <tr key={log.id} className={`${isLightTheme ? "hover:bg-slate-55" : "hover:bg-slate-900/20"}`}>
                              <td className={`p-4 font-mono font-semibold ${textPrimary}`}>{log.date}</td>
                              <td className="p-4 font-semibold text-indigo-500">{sub ? sub.name : "Unmapped Subject"}</td>
                              <td className={`p-4 ${textSecondary}`}>{log.timeSlot}</td>
                              <td className={`p-4 font-mono text-[10px] ${textSecondary}`}>{log.room}</td>
                              <td className="p-4">
                                <span className={`text-[9px] font-extrabold uppercase font-mono px-2 py-0.5 rounded ${
                                  log.status === "Present"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : log.status === "Absent"
                                    ? "bg-rose-500/10 text-rose-400"
                                    : "bg-amber-500/10 text-amber-400"
                                }`}>
                                  {log.status}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => deleteLog(log.id)}
                                  className="text-slate-500 hover:text-rose-500 p-1 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title="Delete log record"
                                >
                                  <Trash2 className="h-4.5 w-4.5 mx-auto" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className={`flex items-center justify-between text-[11px] ${textSecondary} font-mono pt-2`}>
                  <span>Displaying {filteredLogsList.length} of {attendanceLogs.length} entries</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal: Add Subject */}
        {showAddSubjectModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`${isLightTheme ? "bg-white text-slate-900" : "bg-slate-900 text-white"} w-full max-w-md p-6 rounded-2xl border ${isLightTheme ? "border-slate-300" : "border-slate-800"} relative`}>
              <h3 className="text-base font-extrabold mb-4">Add Subject</h3>

              <form onSubmit={handleAddSubject} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">Subject Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Data Structures"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl ${bgInput} focus:outline-none text-sm`}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase font-mono">
                    <span>Target Attendance Threshold</span>
                    <span className="text-indigo-400">{targetPercentage}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="5"
                    value={targetPercentage}
                    onChange={(e) => setTargetPercentage(Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl cursor-pointer transition-all text-xs"
                  >
                    Add Subject
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddSubjectModal(false)}
                    className={`flex-1 ${
                      isLightTheme ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    } font-semibold py-2.5 rounded-xl cursor-pointer transition-all text-xs`}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Timetable Slot */}
        {showAddRoutineModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`${isLightTheme ? "bg-white text-slate-900" : "bg-slate-900 text-white"} w-full max-w-md p-6 rounded-2xl border ${isLightTheme ? "border-slate-300" : "border-slate-800"} relative`}>
              <h3 className="text-base font-extrabold mb-4">Add Timetable Slot</h3>

              <form onSubmit={handleAddRoutine} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Subject</label>
                  <select
                    value={newRoutineSubjectId}
                    onChange={(e) => setNewRoutineSubjectId(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs ${bgInput} focus:outline-none cursor-pointer`}
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Weekday</label>
                  <select
                    value={newRoutineDay}
                    onChange={(e) => setNewRoutineDay(e.target.value as any)}
                    className={`w-full px-3 py-2 rounded-xl text-xs ${bgInput} focus:outline-none cursor-pointer`}
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Time Block</label>
                  <select
                    value={newRoutineTime}
                    onChange={(e) => setNewRoutineTime(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs ${bgInput} focus:outline-none cursor-pointer`}
                  >
                    <option value="09:00 AM - 10:00 AM">09:00 AM - 10:00 AM</option>
                    <option value="10:15 AM - 11:15 AM">10:15 AM - 11:15 AM</option>
                    <option value="11:30 AM - 12:30 PM">11:30 AM - 12:30 PM</option>
                    <option value="01:30 PM - 02:30 PM">01:30 PM - 02:30 PM</option>
                    <option value="02:45 PM - 03:45 PM">02:45 PM - 03:45 PM</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Room</label>
                  <input
                    type="text"
                    placeholder="e.g. Room 401, Lab 2..."
                    value={newRoutineRoom}
                    onChange={(e) => setNewRoutineRoom(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs ${bgInput} focus:outline-none`}
                  />
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl cursor-pointer transition-all text-xs"
                  >
                    Add Slot
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddRoutineModal(false)}
                    className={`flex-1 ${
                      isLightTheme ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    } font-semibold py-2.5 rounded-xl cursor-pointer transition-all text-xs`}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Calendar Cell Quick Mark */}
        {selectedDayDetail && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`${isLightTheme ? "bg-white text-slate-900" : "bg-slate-900 text-white"} w-full max-w-lg p-6 rounded-2xl border ${isLightTheme ? "border-slate-300" : "border-slate-800"} relative`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-extrabold font-sans">
                    {new Date(selectedDayDetail.dateString).toLocaleDateString("default", { dateStyle: "full" })}
                  </h3>
                  <p className={`text-[11px] ${textSecondary} mt-0.5`}>Mark attendance for scheduled classes below.</p>
                </div>
                <button
                  onClick={() => setSelectedDayDetail(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {(() => {
                const dateObj = new Date(selectedDayDetail.dateString);
                const daysArr = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
                const dayName = daysArr[dateObj.getDay()];
                const daySchedule = timetable.filter((item) => item.day === dayName);

                if (daySchedule.length === 0) {
                  return (
                    <div className="text-center py-8 text-xs text-slate-500 italic">
                      No scheduled classes for {dayName}s.
                    </div>
                  );
                }

                return (
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                    {daySchedule.map((slot) => {
                      const sub = subjects.find((s) => s.id === slot.subjectId);
                      const currentStatus = attendanceLogs.find(
                        (l) => l.date === selectedDayDetail.dateString && l.subjectId === slot.subjectId && l.timeSlot === slot.time
                      )?.status;

                      return (
                        <div
                          key={slot.id}
                          className={`p-3 rounded-xl border ${
                            isLightTheme ? "bg-slate-50 border-slate-200" : "bg-slate-950/45 border-slate-900"
                          } flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
                        >
                          <div>
                            <span className={`text-xs font-bold ${textPrimary}`}>{sub ? sub.name : "Unmapped Subject"}</span>
                            <div className="flex items-center space-x-1 text-[9px] text-slate-400 font-mono mt-0.5">
                              <span>{slot.time}</span>
                              <span>•</span>
                              <span>{slot.room}</span>
                            </div>
                          </div>

                          <div className="flex gap-1 shrink-0">
                            {(["Present", "Absent", "Holiday"] as const).map((st) => (
                              <button
                                key={st}
                                onClick={() => {
                                  logAttendance(selectedDayDetail.dateString, slot.subjectId, st, slot.time, slot.room);
                                  setSelectedDayDetail((prev) => {
                                    if (!prev) return null;
                                    const updatedLogs = prev.logs.filter(
                                      (l) => !(l.subjectId === slot.subjectId && l.timeSlot === slot.time)
                                    );
                                    updatedLogs.push({
                                      id: `man-${Math.random()}`,
                                      date: prev.dateString,
                                      subjectId: slot.subjectId,
                                      status: st,
                                      timeSlot: slot.time,
                                      room: slot.room
                                    });
                                    return { ...prev, logs: updatedLogs };
                                  });
                                }}
                                className={`px-2 py-1.5 rounded-lg text-[9px] font-bold font-mono uppercase tracking-wider transition-all border cursor-pointer ${
                                  currentStatus === st
                                    ? st === "Present"
                                      ? "bg-emerald-500 text-white border-emerald-500"
                                      : st === "Absent"
                                      ? "bg-rose-500 text-white border-rose-500"
                                      : "bg-amber-500 text-white border-amber-500"
                                    : `${isLightTheme ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-100" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"}`
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setSelectedDayDetail(null)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-5 rounded-xl cursor-pointer transition-colors"
                >
                  Done
                </button>
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
                <h3 className="text-sm font-bold text-white font-sans font-extrabold">Delete Subject</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Are you sure you want to delete <span className="text-white font-semibold">"{deleteConfirm.name}"</span>? This will also remove its timetable slots and attendance records.
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
                    setSubjects((prev) => prev.filter((s) => s.id !== deleteConfirm.id));
                    setAttendanceLogs((prev) => prev.filter((l) => l.subjectId !== deleteConfirm.id));
                    setTimetable((prev) => prev.filter((t) => t.subjectId !== deleteConfirm.id));
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