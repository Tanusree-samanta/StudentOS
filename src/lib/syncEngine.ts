import { saveUserData, loadUserData } from "./supabaseService";

// Helper keys
const USER_NAME_KEY = "studentos_user_name";
const SEMESTER_KEY = "studentos_user_semester";
const DEPARTMENT_KEY = "studentos_user_department";
const PHONE_KEY = "studentos_user_phone";
const PROFILE_IMAGE_KEY = "studentos_user_profile_image";

const SUBJECTS_KEY = "studentos_subjects";
const ATTENDANCE_LOGS_KEY = "studentos_attendance_logs";
const TIMETABLE_KEY = "studentos_timetable";
const NOTES_KEY = "studentos_subject_files";
const FOLDERS_KEY = "studentos_subject_folders";

const GOALS_KEY = "studentos_planner_goals";
const WEEKLY_TASKS_KEY = "studentos_weekly_tasks";
const HABITS_KEY = "studentos_habits";
const MOOD_LOGS_KEY = "studentos_mood_logs";
const JOURNALS_KEY = "studentos_journals";

const SEMESTERS_KEY = "studentos_semesters";
const EXAMS_KEY = "studentos_exams";

// 1. Pull Firestore database state into local storage
export async function pullFirestoreToLocalState(uid: string): Promise<boolean> {
  try {
    let hasFunctionalData = false;

    // Load users (Profile is not functional data - we don't set hasFunctionalData to true for it)
    const userProfile = await loadUserData<{
      name: string;
      semester?: string;
      department?: string;
      phone?: string;
      profileImage?: string;
    }>("users", uid);

    if (userProfile) {
      if (userProfile.name) localStorage.setItem(USER_NAME_KEY, userProfile.name);
      if (userProfile.semester) localStorage.setItem(SEMESTER_KEY, userProfile.semester);
      if (userProfile.department) localStorage.setItem(DEPARTMENT_KEY, userProfile.department);
      if (userProfile.phone) localStorage.setItem(PHONE_KEY, userProfile.phone);
      if (userProfile.profileImage) localStorage.setItem(PROFILE_IMAGE_KEY, userProfile.profileImage);
    }

    // Load attendance
    const attendanceData = await loadUserData<{ subjects?: any[]; attendanceLogs?: any[] }>("attendance", uid);
    if (attendanceData && ((attendanceData.subjects && attendanceData.subjects.length > 0) || (attendanceData.attendanceLogs && attendanceData.attendanceLogs.length > 0))) {
      hasFunctionalData = true;
      localStorage.setItem(SUBJECTS_KEY, JSON.stringify(attendanceData.subjects || []));
      localStorage.setItem(ATTENDANCE_LOGS_KEY, JSON.stringify(attendanceData.attendanceLogs || []));
    } else {
      localStorage.setItem(SUBJECTS_KEY, JSON.stringify([]));
      localStorage.setItem(ATTENDANCE_LOGS_KEY, JSON.stringify([]));
    }

    // Load routine
    const routineData = await loadUserData<{ timetable?: any[] }>("routine", uid);
    if (routineData && routineData.timetable && routineData.timetable.length > 0) {
      hasFunctionalData = true;
      localStorage.setItem(TIMETABLE_KEY, JSON.stringify(routineData.timetable));
    } else {
      localStorage.setItem(TIMETABLE_KEY, JSON.stringify([]));
    }

    // Load notes
    const notesData = await loadUserData<{ notesList?: any[]; folders?: any[] }>("notes", uid);
    if (notesData && ((notesData.notesList && notesData.notesList.length > 0) || (notesData.folders && notesData.folders.length > 0))) {
      hasFunctionalData = true;
      localStorage.setItem(NOTES_KEY, JSON.stringify(notesData.notesList || []));
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(notesData.folders || []));
    } else {
      localStorage.setItem(NOTES_KEY, JSON.stringify([]));
      localStorage.setItem(FOLDERS_KEY, JSON.stringify([]));
    }

    // Load assignments
    const assignmentsData = await loadUserData<{
      goals?: any[];
      weeklyTasks?: any[];
      habits?: any[];
      moodLogs?: any[];
      journals?: any[];
    }>("assignments", uid);

    if (assignmentsData && (
      (assignmentsData.goals && assignmentsData.goals.length > 0) ||
      (assignmentsData.weeklyTasks && assignmentsData.weeklyTasks.length > 0) ||
      (assignmentsData.habits && assignmentsData.habits.length > 0) ||
      (assignmentsData.moodLogs && assignmentsData.moodLogs.length > 0) ||
      (assignmentsData.journals && assignmentsData.journals.length > 0)
    )) {
      hasFunctionalData = true;
      localStorage.setItem(GOALS_KEY, JSON.stringify(assignmentsData.goals || []));
      localStorage.setItem(WEEKLY_TASKS_KEY, JSON.stringify(assignmentsData.weeklyTasks || []));
      localStorage.setItem(HABITS_KEY, JSON.stringify(assignmentsData.habits || []));
      localStorage.setItem(MOOD_LOGS_KEY, JSON.stringify(assignmentsData.moodLogs || []));
      localStorage.setItem(JOURNALS_KEY, JSON.stringify(assignmentsData.journals || []));
    } else {
      localStorage.setItem(GOALS_KEY, JSON.stringify([]));
      localStorage.setItem(WEEKLY_TASKS_KEY, JSON.stringify([]));
      localStorage.setItem(HABITS_KEY, JSON.stringify([]));
      localStorage.setItem(MOOD_LOGS_KEY, JSON.stringify([]));
      localStorage.setItem(JOURNALS_KEY, JSON.stringify([]));
    }

    // Load cgpa
    const cgpaData = await loadUserData<{ semesters?: any[] }>("cgpa", uid);
    if (cgpaData && cgpaData.semesters && cgpaData.semesters.length > 0) {
      hasFunctionalData = true;
      localStorage.setItem(SEMESTERS_KEY, JSON.stringify(cgpaData.semesters));
      
      // Calculate and save overall CGPA
      let totalCredits = 0;
      let totalPoints = 0;
      cgpaData.semesters.forEach((s: any) => {
        const creds = Number(s.credits) || 0;
        const gpa = Number(s.gpa) || Number(s.sgpa) || 0;
        totalCredits += creds;
        totalPoints += gpa * creds;
      });
      const cgpa = totalCredits === 0 ? 0 : Math.round((totalPoints / totalCredits) * 100) / 100;
      localStorage.setItem("studentos_cumulative_cgpa", cgpa.toString());
    } else {
      localStorage.setItem(SEMESTERS_KEY, JSON.stringify([]));
      localStorage.setItem("studentos_cumulative_cgpa", "0");
    }

    // Load settings/exams
    const settingsData = await loadUserData<{ exams?: any[] }>("settings", uid);
    if (settingsData && settingsData.exams && settingsData.exams.length > 0) {
      hasFunctionalData = true;
      localStorage.setItem(EXAMS_KEY, JSON.stringify(settingsData.exams));
    } else {
      localStorage.setItem(EXAMS_KEY, JSON.stringify([]));
    }

    return hasFunctionalData;
  } catch (err) {
    console.error("Error pulling Firestore state to local:", err);
    return false;
  }
}

// 2. Push current local state to Firestore database
export async function pushLocalStateToFirestore(uid: string): Promise<void> {
  try {
    const localUserName = localStorage.getItem(USER_NAME_KEY) || "Tanusree";
    const localSemester = localStorage.getItem(SEMESTER_KEY) || "Semester 4";
    const localDepartment = localStorage.getItem(DEPARTMENT_KEY) || "Computer Science & Engineering";
    const localPhone = localStorage.getItem(PHONE_KEY) || "";
    const localProfileImage = localStorage.getItem(PROFILE_IMAGE_KEY) || "";

    const localSubjects = localStorage.getItem(SUBJECTS_KEY);
    const localAttendanceLogs = localStorage.getItem(ATTENDANCE_LOGS_KEY);
    const localTimetable = localStorage.getItem(TIMETABLE_KEY);
    const localNotes = localStorage.getItem(NOTES_KEY);

    const localGoals = localStorage.getItem(GOALS_KEY);
    const localWeeklyTasks = localStorage.getItem(WEEKLY_TASKS_KEY);
    const localHabits = localStorage.getItem(HABITS_KEY);
    const localMoodLogs = localStorage.getItem(MOOD_LOGS_KEY);
    const localJournals = localStorage.getItem(JOURNALS_KEY);

    const localSemesters = localStorage.getItem(SEMESTERS_KEY);
    const localExams = localStorage.getItem(EXAMS_KEY);

    // Save profile document
    await saveUserData("users", uid, {
      name: localUserName,
      semester: localSemester,
      department: localDepartment,
      phone: localPhone,
      profileImage: localProfileImage
    });

    // Save attendance document
    if (localSubjects || localAttendanceLogs) {
      await saveUserData("attendance", uid, {
        subjects: localSubjects ? JSON.parse(localSubjects) : null,
        attendanceLogs: localAttendanceLogs ? JSON.parse(localAttendanceLogs) : null
      });
    }

    // Save routine/timetable document
    if (localTimetable) {
      await saveUserData("routine", uid, {
        timetable: JSON.parse(localTimetable)
      });
    }

    // Save study notes document
    const localFolders = localStorage.getItem(FOLDERS_KEY);
    if (localNotes || localFolders) {
      await saveUserData("notes", uid, {
        notesList: localNotes ? JSON.parse(localNotes) : [],
        folders: localFolders ? JSON.parse(localFolders) : []
      });
    }

    // Save assignments/planner document
    if (localGoals || localWeeklyTasks || localHabits || localMoodLogs || localJournals) {
      await saveUserData("assignments", uid, {
        goals: localGoals ? JSON.parse(localGoals) : null,
        weeklyTasks: localWeeklyTasks ? JSON.parse(localWeeklyTasks) : null,
        habits: localHabits ? JSON.parse(localHabits) : null,
        moodLogs: localMoodLogs ? JSON.parse(localMoodLogs) : null,
        journals: localJournals ? JSON.parse(localJournals) : null
      });
    }

    // Save CGPA document
    if (localSemesters) {
      await saveUserData("cgpa", uid, {
        semesters: JSON.parse(localSemesters)
      });
    }

    // Save exams document
    if (localExams) {
      await saveUserData("settings", uid, {
        exams: JSON.parse(localExams)
      });
    }
  } catch (err) {
    console.error("Error pushing local state to Firestore:", err);
  }
}

// 3. Simple State-Hash helper to track local storage changes efficiently
export function initializeEmptyWorkspace(userName?: string) {
  if (userName) {
    localStorage.setItem(USER_NAME_KEY, userName);
  }
  localStorage.setItem(SUBJECTS_KEY, JSON.stringify([]));
  localStorage.setItem(ATTENDANCE_LOGS_KEY, JSON.stringify([]));
  localStorage.setItem(TIMETABLE_KEY, JSON.stringify([]));
  localStorage.setItem(NOTES_KEY, JSON.stringify([]));
  localStorage.setItem(GOALS_KEY, JSON.stringify([]));
  localStorage.setItem(WEEKLY_TASKS_KEY, JSON.stringify([]));
  localStorage.setItem(HABITS_KEY, JSON.stringify([]));
  localStorage.setItem(MOOD_LOGS_KEY, JSON.stringify([]));
  localStorage.setItem(JOURNALS_KEY, JSON.stringify([]));
  localStorage.setItem(SEMESTERS_KEY, JSON.stringify([]));
  localStorage.setItem(EXAMS_KEY, JSON.stringify([]));
  localStorage.setItem("studentos_cumulative_cgpa", "0");
  localStorage.setItem("studentos_subject_folders", JSON.stringify([]));
  localStorage.setItem("studentos_subject_files", JSON.stringify([]));
  localStorage.setItem("studentos_note_categories", JSON.stringify([]));
}

export function getLocalStorageSnapshotHash(): string {
  const parts = [
    localStorage.getItem(USER_NAME_KEY) || "",
    localStorage.getItem(SEMESTER_KEY) || "",
    localStorage.getItem(DEPARTMENT_KEY) || "",
    localStorage.getItem(PHONE_KEY) || "",
    localStorage.getItem(PROFILE_IMAGE_KEY) || "",
    localStorage.getItem(SUBJECTS_KEY) || "",
    localStorage.getItem(ATTENDANCE_LOGS_KEY) || "",
    localStorage.getItem(TIMETABLE_KEY) || "",
    localStorage.getItem(NOTES_KEY) || "",
    localStorage.getItem(FOLDERS_KEY) || "",
    localStorage.getItem(GOALS_KEY) || "",
    localStorage.getItem(WEEKLY_TASKS_KEY) || "",
    localStorage.getItem(HABITS_KEY) || "",
    localStorage.getItem(MOOD_LOGS_KEY) || "",
    localStorage.getItem(JOURNALS_KEY) || "",
    localStorage.getItem(SEMESTERS_KEY) || "",
    localStorage.getItem(EXAMS_KEY) || ""
  ];
  return parts.join("|");
}
