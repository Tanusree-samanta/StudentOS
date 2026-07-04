import { supabase, supabaseUrl, supabaseAnonKey } from "./supabase";

export interface UserProfile {
  name: string;
  email: string;
  semester?: string;
  department?: string;
  profileImage?: string;
  phone?: string;
}

// Helper to determine if credentials are the unconfigured default/demo placeholders
function isPlaceholderConfig(): boolean {
  return (
    !supabaseUrl ||
    supabaseUrl.includes("your-project") ||
    supabaseAnonKey === "your-anon-key" ||
    !supabaseAnonKey
  );
}

// 1. Authentication Functions
export async function registerUser(email: string, password: string, fullName: string): Promise<any> {
  const isPlaceholder = isPlaceholderConfig();
  
  if (!isPlaceholder) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }
      const user = data.user;
      if (!user) throw new Error("No user returned from signup.");

      // Helper to check missing relation / schema errors
      const checkSchemaError = (err: any) => {
        if (err && (err.code === "42P01" || err.message?.includes("profiles") || err.message?.includes("user_sync") || err.message?.includes("students") || err.message?.includes("schema cache") || err.message?.includes("relation"))) {
          localStorage.setItem("supabase_tables_missing", "true");
          window.dispatchEvent(new Event("supabase_tables_missing"));
        }
      };

      // Create profile in the brand new 'profiles' table (Step 1)
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: fullName,
          email: email,
          avatar_url: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        });

      if (profileError) {
        console.warn("Could not insert profile into 'profiles' table:", profileError.message);
        checkSchemaError(profileError);
      }

      // Create user profile in 'students' table for legacy/backup compatibility (Step 10)
      const { error: dbError } = await supabase
        .from("students")
        .upsert({
          id: user.id,
          name: fullName,
          email: email,
          department: "Computer Science & Engineering",
          semester: 4, // default semester as integer
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        });

      if (dbError) {
        console.warn("Could not insert profile into 'students' table:", dbError.message);
        checkSchemaError(dbError);
      }

      // Also create an entry in 'user_sync' for general fallback profile retrieval
      const { error: syncError } = await supabase
        .from("user_sync")
        .upsert({
          uid: user.id,
          collection_name: "users",
          data: {
            name: fullName,
            email: email,
            semester: "Semester 4",
            department: "Computer Science & Engineering",
            profileImage: "",
            phone: ""
          }
        });

      if (syncError) {
        console.warn("Could not insert profile into 'user_sync' table:", syncError.message);
        checkSchemaError(syncError);
      }

      return user;
    } catch (err: any) {
      if (
        err?.code === "auth/email-already-in-use" ||
        err?.message?.includes("already-in-use") ||
        err?.message?.includes("already registered")
      ) {
        throw err;
      }
      console.warn("Real Supabase signup failed, falling back to local simulation:", err);
    }
  }

  // --- LOCAL REGISTRATION FALLBACK ---
  const usersStr = localStorage.getItem("studentos_simulated_users") || "[]";
  let usersList = [];
  try {
    usersList = JSON.parse(usersStr);
  } catch (_) {}

  // Check if email already registered locally
  const alreadyExists = usersList.some((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (alreadyExists) {
    const customErr = new Error("This email is already registered. Please sign in instead.");
    (customErr as any).code = "auth/email-already-in-use";
    throw customErr;
  }

  // Generate new simulated user
  const simulatedUser = {
    id: "local_" + Math.random().toString(36).substring(2, 11),
    uid: "local_" + Math.random().toString(36).substring(2, 11),
    email,
    user_metadata: {
      full_name: fullName,
      email: email,
    },
    app_metadata: {
      provider: "local",
    }
  };

  usersList.push({
    id: simulatedUser.id,
    email,
    password,
    fullName
  });

  localStorage.setItem("studentos_simulated_users", JSON.stringify(usersList));
  localStorage.setItem("studentos_local_user_session", JSON.stringify(simulatedUser));
  localStorage.setItem("studentos_user_name", fullName);
  localStorage.setItem("studentos_user_email", email);

  // Dispatch local auth change event
  window.dispatchEvent(new Event("studentos_local_auth_change"));

  return simulatedUser;
}

export async function loginUser(email: string, password: string): Promise<any> {
  // 1. --- FIRST PRIORITY: CHECK LOCAL SIMULATED USERS ---
  const usersStr = localStorage.getItem("studentos_simulated_users") || "[]";
  let usersList = [];
  try {
    usersList = JSON.parse(usersStr);
  } catch (_) {}

  const match = usersList.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (match) {
    if (match.password === password) {
      const simulatedUser = {
        id: match.id,
        uid: match.id,
        email,
        user_metadata: {
          full_name: match.fullName,
          email: email,
        },
        app_metadata: {
          provider: "local",
        }
      };

      localStorage.setItem("studentos_local_user_session", JSON.stringify(simulatedUser));
      localStorage.setItem("studentos_user_name", match.fullName);
      localStorage.setItem("studentos_user_email", email);
      
      window.dispatchEvent(new Event("studentos_local_auth_change"));
      return simulatedUser;
    } else {
      const customErr = new Error("Invalid password entered for this account.");
      (customErr as any).code = "auth/invalid-credential";
      throw customErr;
    }
  }

  // 2. --- SECOND PRIORITY: DEMO USER AUTO-LOGIN BYPASS ---
  if (email === "tanusree.samanta24@tnu.in" || email.toLowerCase().includes("tanu")) {
    const simulatedUser = {
      id: "local_demo",
      uid: "local_demo",
      email,
      user_metadata: {
        full_name: "Tanusree Samanta",
        email: email,
      },
      app_metadata: {
        provider: "local",
      }
    };

    localStorage.setItem("studentos_local_user_session", JSON.stringify(simulatedUser));
    localStorage.setItem("studentos_user_name", "Tanusree Samanta");
    localStorage.setItem("studentos_user_email", email);
    
    window.dispatchEvent(new Event("studentos_local_auth_change"));
    return simulatedUser;
  }

  // 3. --- THIRD PRIORITY: REAL SUPABASE AUTHENTICATION (IF CONFIGURED) ---
  const isPlaceholder = isPlaceholderConfig();
  if (!isPlaceholder) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }
      return data.user;
    } catch (err: any) {
      const errStr = String(err?.message || err).toLowerCase();
      // Handle the case where the user might have registered on real Supabase but has connection or other auth errors
      if (
        errStr.includes("invalid-credential") ||
        errStr.includes("invalid login credentials") ||
        errStr.includes("invalid credentials") ||
        errStr.includes("invalid_grant")
      ) {
        throw err;
      }
      console.warn("Real Supabase login failed:", err);
      throw err;
    }
  }

  // 4. --- DEFAULT FALLBACK ERROR ---
  const defaultErr = new Error("No account found with this email. Please sign up first.");
  (defaultErr as any).code = "auth/invalid-credential";
  throw defaultErr;
}

export async function signOutUser(): Promise<void> {
  localStorage.removeItem("studentos_local_user_session");
  window.dispatchEvent(new Event("studentos_local_auth_change"));

  if (!isPlaceholderConfig()) {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (_) {}
  }
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  if (!isPlaceholderConfig()) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#recovery`
    });
    if (error) throw error;
  }
}

export async function updateUserPassword(password: string): Promise<void> {
  if (!isPlaceholderConfig()) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }
}

export async function syncGoogleUserProfile(user: any): Promise<boolean> {
  const uid = user.id || user.uid;
  const email = user.email || user.user_metadata?.email || "";
  const fullName = user.user_metadata?.full_name || "Tanusree";
  const profilePhoto = user.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150";

  let isNew = false;
  let createdAt = new Date().toISOString();
  
  if (localStorage.getItem("supabase_tables_missing") !== "true") {
    try {
      // Check if profile already exists in 'students'
      const { data: existingStudent } = await supabase
        .from("students")
        .select("created_at")
        .eq("id", uid)
        .maybeSingle();

      isNew = !existingStudent;
      if (existingStudent?.created_at) {
        createdAt = existingStudent.created_at;
      }

      const lastLogin = new Date().toISOString();

      // Save/Upsert in profiles table
      await supabase
        .from("profiles")
        .upsert({
          id: uid,
          full_name: fullName,
          email: email,
          avatar_url: profilePhoto,
          updated_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        });

      // Save/Upsert in students table
      await supabase
        .from("students")
        .upsert({
          id: uid,
          name: fullName,
          email: email,
          department: "Computer Science & Engineering",
          semester: 4,
          created_at: createdAt,
          last_login: lastLogin,
        });

      // Save/Upsert in user_sync table
      await supabase
        .from("user_sync")
        .upsert({
          uid: uid,
          collection_name: "users",
          data: {
            uid: uid,
            name: fullName,
            email: email,
            profilePhoto: profilePhoto,
            createdAt: createdAt,
            lastLogin: lastLogin
          }
        });
    } catch (e) {
      console.warn("Could not sync Google user profile with DB:", e);
    }
  } else {
    // If we are in local fallback / bypass mode, we use local storage as mock DB
    const saved = localStorage.getItem("studentos_google_user");
    if (!saved) {
      isNew = true;
    } else {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.uid === uid) {
          createdAt = parsed.createdAt || createdAt;
        } else {
          isNew = true;
        }
      } catch (_) {
        isNew = true;
      }
    }
  }

  // Always save in localStorage too for returning user detection on this device
  localStorage.setItem("studentos_user_name", fullName);
  localStorage.setItem("studentos_user_email", email);
  localStorage.setItem("studentos_google_user", JSON.stringify({
    uid,
    name: fullName,
    email: email,
    profilePhoto,
    createdAt,
    lastLogin: new Date().toISOString()
  }));

  return isNew;
}

// 2. Generic Save & Load Supabase Helpers matching original Firebase structure
export async function saveUserData<T extends object>(collectionName: string, uid: string, data: T): Promise<void> {
  if (uid && uid.startsWith("local_")) {
    console.log(`[Offline Local Mode] Skipping cloud save for ${collectionName}.`);
    return;
  }

  const checkSchemaError = (err: any) => {
    if (err && (err.code === "42P01" || err.message?.includes("relation") || err.message?.includes("does not exist") || err.message?.includes("schema cache"))) {
      localStorage.setItem("supabase_tables_missing", "true");
      window.dispatchEvent(new Event("supabase_tables_missing"));
    }
  };

  // --- SAVE TO REAL DIRECT STRUCTURAL TABLES ---
  try {
    if (collectionName === "users") {
      const profile = data as any;
      const semInt = parseInt(profile.semester?.replace(/\D/g, "") || "4") || 4;
      
      // Save to public.profiles
      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert({
          id: uid,
          full_name: profile.name || "",
          email: profile.email || `${uid}@studentos.local`,
          avatar_url: profile.profileImage || "",
          updated_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        });
      if (profileErr) checkSchemaError(profileErr);

      // Save to public.students
      const { error: studentErr } = await supabase
        .from("students")
        .upsert({
          id: uid,
          name: profile.name || "",
          email: profile.email || `${uid}@studentos.local`,
          department: profile.department || "Computer Science & Engineering",
          semester: semInt,
          last_login: new Date().toISOString()
        });
      if (studentErr) checkSchemaError(studentErr);
    }

    else if (collectionName === "attendance") {
      const attData = data as any;
      if (attData.subjects) {
        // Clear old records
        const { error: delErr } = await supabase.from("attendance_records").delete().eq("user_id", uid);
        if (delErr) checkSchemaError(delErr);
        
        if (attData.subjects.length > 0) {
          const rows = attData.subjects.map((s: any) => ({
            id: s.id || `${uid}_${Math.random().toString(36).substring(7)}`,
            user_id: uid,
            subject_name: s.name,
            present_count: s.present || 0,
            absent_count: s.absent || 0,
            total_classes: (s.present || 0) + (s.absent || 0) + (s.late || 0),
            attendance_percentage: parseFloat(((s.present || 0) / Math.max((s.present || 0) + (s.absent || 0) + (s.late || 0), 1) * 100).toFixed(2)),
            updated_at: new Date().toISOString()
          }));
          const { error: insErr } = await supabase.from("attendance_records").insert(rows);
          if (insErr) checkSchemaError(insErr);
        }
      }
    }

    else if (collectionName === "routine") {
      const routineData = data as any;
      if (routineData.timetable) {
        const rows = routineData.timetable.map((item: any) => ({
          id: item.id || `${uid}_${Math.random().toString(36).substring(7)}`,
          user_id: uid,
          day_name: item.day,
          title: item.subjectId,
          description: `${item.time} | ${item.room}`,
          completed: false,
          updated_at: new Date().toISOString()
        }));

        // Try routines first (defined in schema.sql)
        const { error: delErr } = await supabase.from("routines").delete().eq("user_id", uid);
        if (!delErr) {
          if (rows.length > 0) {
            const { error: insErr } = await supabase.from("routines").insert(rows);
            if (insErr) checkSchemaError(insErr);
          }
        } else {
          // Fallback to legacy class_schedule table
          const { error: delErrLegacy } = await supabase.from("class_schedule").delete().eq("user_id", uid);
          if (delErrLegacy) checkSchemaError(delErrLegacy);

          if (rows.length > 0) {
            const { error: insErrLegacy } = await supabase.from("class_schedule").insert(rows);
            if (insErrLegacy) checkSchemaError(insErrLegacy);
          }
        }
      }
    }

    else if (collectionName === "notes") {
      const notesData = data as any;
      const notesList = notesData.notesList || notesData.files || [];
      // Clear old records
      const { error: delErr } = await supabase.from("subject_notes").delete().eq("user_id", uid);
      if (delErr) checkSchemaError(delErr);

      if (notesList.length > 0) {
        const rows = notesList.map((f: any) => ({
          id: f.id || `${uid}_${Math.random().toString(36).substring(7)}`,
          user_id: uid,
          subject_name: f.subjectName || "General",
          file_name: f.fileName || "unnamed",
          file_url: f.contentUrl || "",
          storage_path: f.storagePath || f.id || "",
          file_type: f.fileType || "txt",
          file_size: f.fileSize || "0 KB",
          uploaded_at: f.uploadDate ? new Date(f.uploadDate).toISOString() : new Date().toISOString(),
          is_favorite: f.starred || false
        }));
        const { error: insErr } = await supabase.from("subject_notes").insert(rows);
        if (insErr) checkSchemaError(insErr);
      }
    }

    else if (collectionName === "assignments") {
      const assData = data as any;
      
      // Clear and upsert planner_tasks (weeklyTasks)
      if (assData.weeklyTasks) {
        const { error: delErr } = await supabase.from("planner_tasks").delete().eq("user_id", uid);
        if (delErr) checkSchemaError(delErr);

        if (assData.weeklyTasks.length > 0) {
          const rows = assData.weeklyTasks.map((t: any) => ({
            id: t.id || `${uid}_${Math.random().toString(36).substring(7)}`,
            user_id: uid,
            title: t.title || "Untitled Task",
            description: t.order?.toString() || "",
            due_date: null,
            priority: "Medium",
            status: t.completed ? "Completed" : "Pending",
            day_name: t.day,
            completed: t.completed || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          const { error: insErr } = await supabase.from("planner_tasks").insert(rows);
          if (insErr) checkSchemaError(insErr);
        }
      }

      // Clear and upsert user_targets (goals)
      if (assData.goals) {
        const { error: delErr } = await supabase.from("user_targets").delete().eq("user_id", uid);
        if (delErr) checkSchemaError(delErr);

        if (assData.goals.length > 0) {
          const rows = assData.goals.map((g: any) => ({
            id: g.id || `${uid}_${Math.random().toString(36).substring(7)}`,
            user_id: uid,
            target_title: g.title,
            target_description: g.notes || g.priority || "",
            target_day: g.deadline || "",
            completed: g.completed || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          const { error: insErr } = await supabase.from("user_targets").insert(rows);
          if (insErr) checkSchemaError(insErr);
        }
      }
    }

    else if (collectionName === "cgpa") {
      const cgpaData = data as any;
      if (cgpaData.semesters) {
        // Clear old records
        const { error: delErr } = await supabase.from("cgpa_records").delete().eq("user_id", uid);
        if (delErr) checkSchemaError(delErr);

        if (cgpaData.semesters.length > 0) {
          const rows = cgpaData.semesters.map((s: any) => ({
            id: s.id || `${uid}_${Math.random().toString(36).substring(7)}`,
            user_id: uid,
            semester_name: s.semesterName,
            sgpa: s.gpa || 0.00,
            credits: s.credits || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          const { error: insErr } = await supabase.from("cgpa_records").insert(rows);
          if (insErr) checkSchemaError(insErr);
        }
      }
    }

    else if (collectionName === "settings") {
      const examData = data as any;
      if (examData.exams) {
        // Clear old records
        const { error: delErr } = await supabase.from("exam_schedules").delete().eq("user_id", uid);
        if (delErr) checkSchemaError(delErr);

        if (examData.exams.length > 0) {
          const rows = examData.exams.map((e: any) => ({
            id: e.id || `${uid}_${Math.random().toString(36).substring(7)}`,
            user_id: uid,
            subject_name: e.subject || "General",
            exam_date: e.date || "",
            exam_time: e.time || "",
            exam_type: e.examType || "Midterm",
            countdown_enabled: !e.completed,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          const { error: insErr } = await supabase.from("exam_schedules").insert(rows);
          if (insErr) checkSchemaError(insErr);
        }
      }
    }
  } catch (dbEx: any) {
    console.warn("Structural table save failed, falling back to JSON sync:", dbEx);
    checkSchemaError(dbEx);
  }

  // --- SAVE TO FALLBACK UNIFIED JSON BACKEND (user_sync) ---
  const { error } = await supabase
    .from("user_sync")
    .upsert({
      uid: uid,
      collection_name: collectionName,
      data: data
// @ts-ignore
    }, { onConflict: "uid,collection_name" });

  if (error) {
    console.warn(`[Supabase Error] General sync fail for ${collectionName}:`, error.message);
    checkSchemaError(error);
  } else {
    // If successful, reset tables missing flag
    if (localStorage.getItem("supabase_tables_missing") === "true") {
      // Just check if we want to remove it
    }
  }
}

export async function loadUserData<T>(collectionName: string, uid: string): Promise<T | null> {
  if (uid && uid.startsWith("local_")) {
    console.log(`[Offline Local Mode] Skipping cloud load for ${collectionName}.`);
    return null;
  }

  const checkSchemaError = (err: any) => {
    if (err && (err.code === "42P01" || err.message?.includes("relation") || err.message?.includes("does not exist") || err.message?.includes("schema cache"))) {
      localStorage.setItem("supabase_tables_missing", "true");
      window.dispatchEvent(new Event("supabase_tables_missing"));
    }
  };

  // --- TRY LOADING FROM STRUCTURAL TABLES FIRST ---
  try {
    if (collectionName === "users") {
      const { data: profileRows, error: profileErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid);
      
      if (!profileErr && profileRows && profileRows.length > 0) {
        const row = profileRows[0];
        
        // Also get semester / department from students if exists
        const { data: studentRows } = await supabase
          .from("students")
          .select("*")
          .eq("id", uid);
        const sRow = studentRows && studentRows.length > 0 ? studentRows[0] : {};

        return {
          name: row.full_name || sRow.name || "",
          email: row.email || sRow.email || "",
          semester: sRow.semester ? `Semester ${sRow.semester}` : "Semester 4",
          department: sRow.department || "Computer Science & Engineering",
          phone: sRow.phone || "",
          profileImage: row.avatar_url || ""
        } as unknown as T;
      }
    }

    else if (collectionName === "attendance") {
      const { data: records, error: recErr } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("user_id", uid);

      if (!recErr && records && records.length > 0) {
        const subjects = records.map(r => ({
          id: r.id.includes("_") ? r.id.split("_").pop() : r.id,
          name: r.subject_name,
          present: r.present_count,
          absent: r.absent_count,
          late: 0,
          targetPercent: 75
        }));

        // Load the logs from JSON sync since it's a sub-feature
        const { data: syncData } = await supabase
          .from("user_sync")
          .select("data")
          .eq("uid", uid)
          .eq("collection_name", "attendance");
        const logs = syncData && syncData.length > 0 ? (syncData[0].data as any)?.attendanceLogs || [] : [];

        return {
          subjects,
          attendanceLogs: logs
        } as unknown as T;
      }
    }

    else if (collectionName === "routine") {
      let records: any[] = [];
      let recErr: any = null;

      // Try routines table first
      const { data: recs1, error: err1 } = await supabase
        .from("routines")
        .select("*")
        .eq("user_id", uid);

      if (!err1) {
        records = recs1 || [];
      } else {
        // Fallback to legacy class_schedule
        const { data: recs2, error: err2 } = await supabase
          .from("class_schedule")
          .select("*")
          .eq("user_id", uid);
        if (!err2) {
          records = recs2 || [];
        } else {
          recErr = err1; // Keep original error if both failed
        }
      }

      if (!recErr && records && records.length > 0) {
        const timetable = records.map(r => {
          const day = r.day_name || r.day || "";
          const subjectId = r.title || r.subject || r.subject_id || r.subjectId || "";
          let time = r.time || "";
          let room = r.room || "";
          if (!time && r.description) {
            const parts = r.description.split(" | ");
            time = parts[0] || "";
            room = parts[1] || "";
          }
          return {
            id: r.id,
            day,
            time,
            room,
            subjectId
          };
        });

        return { timetable } as unknown as T;
      }
    }

    else if (collectionName === "notes") {
      const { data: records, error: recErr } = await supabase
        .from("subject_notes")
        .select("*")
        .eq("user_id", uid);

      if (!recErr && records && records.length > 0) {
        const notesList = records.map(r => ({
          id: r.id,
          subjectName: r.subject_name,
          fileName: r.file_name,
          fileSize: r.file_size,
          fileType: r.file_type,
          uploadDate: r.uploaded_at ? r.uploaded_at.split("T")[0] : new Date().toISOString().split("T")[0],
          starred: r.is_favorite,
          pinned: false,
          contentUrl: r.file_url,
          storagePath: r.storage_path
        }));

        return { notesList } as unknown as T;
      }
    }

    else if (collectionName === "assignments") {
      const { data: tasks, error: tErr } = await supabase
        .from("planner_tasks")
        .select("*")
        .eq("user_id", uid);
      const { data: targets, error: gErr } = await supabase
        .from("user_targets")
        .select("*")
        .eq("user_id", uid);

      if ((!tErr && tasks && tasks.length > 0) || (!gErr && targets && targets.length > 0)) {
        const weeklyTasks = (tasks || []).map(t => ({
          id: t.id,
          day: t.day_name,
          title: t.title,
          completed: t.completed,
          order: parseInt(t.description) || 0
        }));

        const goals = (targets || []).map(g => ({
          id: g.id,
          title: g.target_title,
          priority: g.target_description.includes("High") ? "High" : g.target_description.includes("Low") ? "Low" : "Medium",
          deadline: g.target_day,
          notes: g.target_description,
          completed: g.completed
        }));

        // Load metadata (habits, journals, moodLogs) from JSON sync
        const { data: syncData } = await supabase
          .from("user_sync")
          .select("data")
          .eq("uid", uid)
          .eq("collection_name", "assignments");
        const fallback = syncData && syncData.length > 0 ? (syncData[0].data as any) : {};

        return {
          goals,
          weeklyTasks,
          habits: fallback.habits || [],
          moodLogs: fallback.moodLogs || [],
          journals: fallback.journals || []
        } as unknown as T;
      }
    }

    else if (collectionName === "cgpa") {
      const { data: records, error: recErr } = await supabase
        .from("cgpa_records")
        .select("*")
        .eq("user_id", uid);

      if (!recErr && records && records.length > 0) {
        const semesters = records.map(r => ({
          id: r.id,
          semesterName: r.semester_name,
          gpa: parseFloat(r.sgpa) || 0,
          credits: r.credits || 0
        }));

        return { semesters } as unknown as T;
      }
    }

    else if (collectionName === "settings") {
      const { data: records, error: recErr } = await supabase
        .from("exam_schedules")
        .select("*")
        .eq("user_id", uid);

      if (!recErr && records && records.length > 0) {
        const exams = records.map(r => ({
          id: r.id,
          subject: r.subject_name,
          date: r.exam_date,
          time: r.exam_time,
          examType: r.exam_type,
          completed: !r.countdown_enabled,
          semester: "Semester 4"
        }));

        return { exams } as unknown as T;
      }
    }
  } catch (dbEx: any) {
    console.warn("Structural table load failed, falling back to JSON:", dbEx);
    checkSchemaError(dbEx);
  }

  // --- FALLBACK TO LOAD FROM JSON BACKEND (user_sync) ---
  const { data, error } = await supabase
    .from("user_sync")
    .select("data")
    .eq("uid", uid)
    .eq("collection_name", collectionName);

  if (error) {
    checkSchemaError(error);
  }

  if (!error && data && data.length > 0) {
    return data[0].data as T;
  }

  // Fallback: profiles loading from 'students' table
  if (collectionName === "users") {
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("*")
      .eq("id", uid);
    if (studentError) checkSchemaError(studentError);
    if (!studentError && studentData && studentData.length > 0) {
      const student = studentData[0];
      return {
        name: student.name,
        email: student.email,
        semester: `Semester ${student.semester}`,
        department: student.department,
        phone: "",
        profileImage: ""
      } as unknown as T;
    }
  }

  return null;
}

// 3. Auth state change listener matching the App's subscription model
export function onAuthStateChanged(authInstance: any, callback: (user: any) => void) {
  const checkLocalSession = () => {
    const sessionStr = localStorage.getItem("studentos_local_user_session");
    if (sessionStr) {
      try {
        return JSON.parse(sessionStr);
      } catch (_) {}
    }
    return null;
  };

  const localUser = checkLocalSession();
  if (localUser) {
    callback(localUser);
  } else {
    // Get active session user immediately
    supabase.auth.getUser().then(({ data: { user } }) => {
      const currentLocal = checkLocalSession();
      if (currentLocal) {
        callback(currentLocal);
      } else if (user) {
        callback(user);
      } else {
        callback(null);
      }
    }).catch(() => {
      // If network is offline, check local fallback
      const currentLocal = checkLocalSession();
      callback(currentLocal);
    });
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    const currentLocal = checkLocalSession();
    if (currentLocal) {
      callback(currentLocal);
    } else {
      callback(session?.user || null);
    }
  });

  const handleLocalAuthChange = () => {
    const currentLocal = checkLocalSession();
    callback(currentLocal);
  };
  window.addEventListener("studentos_local_auth_change", handleLocalAuthChange);

  return () => {
    subscription.unsubscribe();
    window.removeEventListener("studentos_local_auth_change", handleLocalAuthChange);
  };
}

// 4. Supabase Storage upload and retrieval functions
export async function uploadNoteFile(file: File, userId: string): Promise<{ fileUrl: string; storagePath: string }> {
  if (!userId || userId.startsWith("local_")) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          fileUrl: reader.result as string,
          storagePath: `local_${Math.random().toString(36).substring(7)}`
        });
      };
      reader.onerror = () => reject(new Error("File reading failed"));
      reader.readAsDataURL(file);
    });
  }

  const fileExt = file.name.split('.').pop() || '';
  const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, "_");
  const uniqueId = Math.random().toString(36).substring(7);
  const storagePath = `${userId}/${cleanName}_${uniqueId}_${Date.now()}.${fileExt}`;

  // Try subject-notes bucket first, fall back to studentos-notes if upload fails
  const buckets = ["subject-notes", "studentos-notes"];
  let lastError = null;

  for (const bucketName of buckets) {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false
        });

      if (!error) {
        // Try getting a signed URL first (private bucket handling)
        try {
          const { data: signedData, error: signedError } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(storagePath, 31536000); // 1 year expiration for persistence
          if (!signedError && signedData?.signedUrl) {
            return {
              fileUrl: signedData.signedUrl,
              storagePath: data?.path || storagePath
            };
          }
        } catch (_) {}

        // Fallback to public URL (public bucket handling)
        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(storagePath);

        return {
          fileUrl: publicUrlData?.publicUrl || "",
          storagePath: data?.path || storagePath
        };
      } else {
        lastError = error;
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  console.warn("Supabase Storage upload failed, falling back to base64:", lastError);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        fileUrl: reader.result as string,
        storagePath: `local_${Math.random().toString(36).substring(7)}`
      });
    };
    reader.onerror = () => reject(new Error("File reading failed"));
    reader.readAsDataURL(file);
  });
}

export async function getNoteFileUrl(storagePath: string, bucketName = "subject-notes"): Promise<string> {
  if (!storagePath || storagePath.startsWith("local_") || storagePath.startsWith("data:")) {
    return storagePath;
  }

  // Don't attempt real Supabase Storage calls if credentials are placeholders —
  // this would otherwise fail with a network error every time.
  if (isPlaceholderConfig()) {
    return storagePath;
  }

  try {
    // 1. If private bucket: try creating a signed URL
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(storagePath, 120);
      
      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    } catch (e) {
      console.warn("Failed to create signed URL, trying public URL:", e);
    }

    // 2. If public bucket: try getPublicUrl
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(storagePath);

    if (data?.publicUrl) {
      return data.publicUrl;
    }

    return storagePath;
  } catch (err) {
    console.warn("Could not generate Supabase URL for path:", storagePath, err);
    // If the primary bucket failed and was subject-notes, try falling back to studentos-notes
    if (bucketName === "subject-notes") {
      try {
        return await getNoteFileUrl(storagePath, "studentos-notes");
      } catch (_) {}
    }
    if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
      return storagePath;
    }
    throw err;
  }
}

export async function deleteNoteFileFromStorage(storagePath: string): Promise<boolean> {
  if (!storagePath || storagePath.startsWith("local_") || storagePath.startsWith("data:")) {
    return true;
  }

  const buckets = ["subject-notes", "studentos-notes"];
  let deleted = false;

  for (const bucketName of buckets) {
    try {
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([storagePath]);

      if (!error) {
        deleted = true;
      }
    } catch (err) {
      console.warn(`Failed to delete storage path ${storagePath} from bucket ${bucketName}:`, err);
    }
  }

  return deleted;
}

export { supabase };
