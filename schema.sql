-- ==============================================================================
-- StudentOS AI - Supabase Database Schema
-- ==============================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Routines Table (Weekly class schedules)
CREATE TABLE IF NOT EXISTS public.routines (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day_name TEXT NOT NULL, -- e.g. 'Monday', 'Tuesday'
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Subject Notes Table (Uploaded material and metadata)
CREATE TABLE IF NOT EXISTS public.subject_notes (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    storage_path TEXT,
    file_type TEXT,
    file_size TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    is_favorite BOOLEAN DEFAULT FALSE
);

-- 4. Exam Schedules Table
CREATE TABLE IF NOT EXISTS public.exam_schedules (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    exam_date TEXT NOT NULL,
    exam_time TEXT,
    exam_type TEXT,
    countdown_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CGPA Records Table
CREATE TABLE IF NOT EXISTS public.cgpa_records (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    semester_name TEXT NOT NULL,
    sgpa NUMERIC(4,2) DEFAULT 0.00,
    credits INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Planner Tasks Table (Weekly tasks and homework list)
CREATE TABLE IF NOT EXISTS public.planner_tasks (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    priority TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'Pending',
    day_name TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Attendance Records Table
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    present_count INTEGER DEFAULT 0,
    absent_count INTEGER DEFAULT 0,
    total_classes INTEGER DEFAULT 0,
    attendance_percentage NUMERIC(5,2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. User Targets Table (Personal goals tracker)
CREATE TABLE IF NOT EXISTS public.user_targets (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_title TEXT NOT NULL,
    target_description TEXT,
    target_day TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. (Fallback Compatibility) general user_sync table
CREATE TABLE IF NOT EXISTS public.user_sync (
    uid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    collection_name TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (uid, collection_name)
);

-- 10. (Fallback Compatibility) students table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    department TEXT DEFAULT 'Computer Science & Engineering',
    semester INTEGER DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- Enable Row Level Security (RLS) on All Tables
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cgpa_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================

-- Drop existing policies if they already exist
DROP POLICY IF EXISTS "Allow individual read/write profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual read/write routines" ON public.routines;
DROP POLICY IF EXISTS "Allow individual read/write subject_notes" ON public.subject_notes;
DROP POLICY IF EXISTS "Allow individual read/write exam_schedules" ON public.exam_schedules;
DROP POLICY IF EXISTS "Allow individual read/write cgpa_records" ON public.cgpa_records;
DROP POLICY IF EXISTS "Allow individual read/write planner_tasks" ON public.planner_tasks;
DROP POLICY IF EXISTS "Allow individual read/write attendance_records" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow individual read/write user_targets" ON public.user_targets;
DROP POLICY IF EXISTS "Allow individual read/write user_sync" ON public.user_sync;
DROP POLICY IF EXISTS "Allow individual read/write students" ON public.students;

-- Recreate policies where auth.uid() matches owner columns
CREATE POLICY "Allow individual read/write profiles" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Allow individual read/write routines" ON public.routines FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write subject_notes" ON public.subject_notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write exam_schedules" ON public.exam_schedules FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write cgpa_records" ON public.cgpa_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write planner_tasks" ON public.planner_tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write attendance_records" ON public.attendance_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write user_targets" ON public.user_targets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write user_sync" ON public.user_sync FOR ALL USING (auth.uid() = uid);
CREATE POLICY "Allow individual read/write students" ON public.students FOR ALL USING (auth.uid() = id);
