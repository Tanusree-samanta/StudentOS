import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "https://your-project.supabase.co";
export const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "your-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});
