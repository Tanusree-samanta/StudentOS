export type ScreenID =
  | "login"
  | "signin"
  | "signup"
  | "forgot_password"
  | "reset_password"
  | "phone_entry"
  | "dashboard"
  | "attendance"
  | "cgpa"
  | "ai_study"
  | "subject_notes"
  | "daily_planner";

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  updatedAt: string;
  starred: boolean;
}

export interface SubjectFile {
  id: string;
  subjectName: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  uploadDate: string;
  starred: boolean;
  pinned: boolean;
  contentUrl: string;
  storagePath?: string;
}

export interface CgpaSemester {
  id: string;
  semesterName: string;
  gpa: number;
  credits: number;
}

export interface Exam {
  id: string;
  subject: string;
  date: string;
  time: string;
  room?: string;
  semester: string;
  examType: "Midterm" | "Final" | "Quiz" | "Practical" | "Other";
  completed: boolean;
}

export interface PlannerGoal {
  id: string;
  title: string;
  priority: "High" | "Medium" | "Low";
  deadline: string;
  notes: string;
  completed: boolean;
}

export interface WeeklyTask {
  id: string;
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  title: string;
  completed: boolean;
  order: number;
}

export interface Habit {
  id: string;
  title: string;
  completedDates: string[]; // YYYY-MM-DD
}

export interface MoodLog {
  date: string; // YYYY-MM-DD
  mood: "Focused" | "Happy" | "Calm" | "Tired" | "Stressed";
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
}

export interface SubjectAttendance {
  id: string;
  name: string;
  present: number;
  absent: number;
  late: number;
  targetPercent: number;
}

export interface CourseGrade {
  id: string;
  name: string;
  credits: number;
  grade: string;
  points: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
}
