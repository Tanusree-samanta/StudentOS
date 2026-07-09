import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { ScreenID } from "../types";
import { loginUser } from "../lib/supabaseService";


interface LoginScreenProps {
  onNavigate: (screen: ScreenID, direction: "none" | "push" | "push_back") => void;
  setUserName?: (name: string) => void;
}

export default function LoginScreen({ onNavigate, setUserName }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<React.ReactNode | null>(null);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setErrorMessage(null);

    try {
      const user = await loginUser(email, password);
      let calculatedName = "Tanusree";
      if (email === "samantatanusree2005@gmail.com" || email.toLowerCase().includes("tanusree")) {
        calculatedName = "Tanusree";
      } else {
        const localPart = email.split("@")[0];
        calculatedName = localPart.charAt(0).toUpperCase() + localPart.slice(1);
      }
      if (setUserName) {
        setUserName(calculatedName);
      }
      onNavigate("dashboard", "push");
    } catch (error: any) {
      // 1. Robustly parse error details to avoid empty string or "{}"
      let rawMsg = "";
      if (error && typeof error === "object") {
        rawMsg = error.message || error.error_description || error.error || error.description || error.msg || "";
        if (typeof rawMsg !== "string") {
          try {
            rawMsg = JSON.stringify(rawMsg);
          } catch (_) {
            rawMsg = "";
          }
        }
      } else if (typeof error === "string") {
        rawMsg = error;
      }

      let errStr = rawMsg.trim();
      if (!errStr || errStr === "{}" || errStr.toLowerCase() === "[object object]") {
        const strRepr = error ? String(error) : "";
        if (strRepr && strRepr !== "[object Object]" && strRepr !== "{}") {
          errStr = strRepr;
        } else {
          errStr = "The university's authentication service is offline or unconfigured.";
        }
      }

      console.warn("Login error details:", errStr);
      
      const isNotAllowed = error?.code === "auth/operation-not-allowed" || errStr.toLowerCase().includes("disabled") || errStr.toLowerCase().includes("not allowed");
      if (isNotAllowed) {
        setErrorMessage(
          <div className="space-y-2">
            <p className="font-bold text-rose-700 flex items-center gap-1 text-xs">⚠️ Supabase Authentication Setup Required</p>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              The <strong>Email/Password</strong> sign-in method is currently disabled or unconfigured in your Supabase project.
            </p>
            <ol className="list-decimal list-inside text-[11px] text-slate-600 space-y-1 pl-1 font-semibold">
              <li>Open your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Supabase Dashboard</a></li>
              <li>Navigate to <strong>Authentication</strong> &rarr; <strong>Providers</strong> &rarr; <strong>Email</strong></li>
              <li>Ensure <strong>Enable Email Signup</strong> is toggled ON and saved</li>
            </ol>
          </div>
        );
      } else {
        const isRateLimit = error?.status === 429 || 
          error?.code?.includes("rate_limit") || 
          errStr.toLowerCase().includes("rate limit") || 
          errStr.toLowerCase().includes("rate_limit") || 
          errStr.toLowerCase().includes("too many requests") ||
          errStr.toLowerCase().includes("limit exceeded") ||
          errStr.toLowerCase().includes("exceeded") ||
          errStr.toLowerCase().includes("over_limit") ||
          errStr.toLowerCase().includes("security purposes");

        if (isRateLimit) {
          setErrorMessage(
            <div className="space-y-1.5 text-left" id="rate-limit-error-login">
              <p className="font-bold text-amber-700 flex items-center gap-1 text-[13px]">⚠️ Email service rate limit reached</p>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                The university portal's authentication service is currently rate-limited. To avoid waiting, you can bypass the login and access the workstation demo instantly.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  id="bypass-login-btn"
                  onClick={() => {
                    if (setUserName) setUserName("Tanusree");
                    onNavigate("dashboard", "push");
                  }}
                  className="px-2.5 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-[10px] font-bold border border-amber-200 transition-colors shadow-sm cursor-pointer"
                >
                  Bypass with Instant Demo Profile
                </button>
              </div>
            </div>
          );
        } else {
          let msg: React.ReactNode = errStr || "Invalid credentials. Please try again.";
          const isInvalidCreds = error?.code === "auth/invalid-credential" || 
            errStr.toLowerCase().includes("invalid-credential") || 
            errStr.toLowerCase().includes("invalid login credentials") || 
            errStr.toLowerCase().includes("invalid credentials") ||
            errStr.toLowerCase().includes("credential") ||
            errStr.toLowerCase().includes("invalid_grant");
          
          const isEmailNotConfirmed = errStr.toLowerCase().includes("email not confirmed") || 
            errStr.toLowerCase().includes("unconfirmed") || 
            errStr.toLowerCase().includes("confirmation") ||
            error?.code?.includes("email_not_confirmed");

          if (isEmailNotConfirmed) {
            msg = (
              <div className="space-y-2 text-left p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl" id="unconfirmed-email-error">
                <p className="font-bold text-amber-600 flex items-center gap-1.5 text-[13px]">✉️ Email Confirmation Required</p>
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  Your email is not confirmed yet. To bypass this, click below:
                </p>
                <button
                  type="button"
                  id="bypass-email-btn"
                  onClick={() => {
                    const localPart = email.split("@")[0] || "Tanusree";
                    const capitalized = localPart.charAt(0).toUpperCase() + localPart.slice(1);
                    if (setUserName) setUserName(capitalized);
                    onNavigate("dashboard", "push");
                  }}
                  className="w-full px-3 py-2 bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Skip Confirmation & Enter Demo Workspace
                </button>
              </div>
            );
          } else if (isInvalidCreds) {
            msg = (
              <div className="space-y-1.5 text-left" id="invalid-creds-error">
                <p className="font-bold text-rose-700 flex items-center gap-1 text-[13px]">❌ Invalid login credentials</p>
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  The email or password entered is incorrect, or an account with this email has not been registered yet.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    id="signup-btn-from-error"
                    onClick={() => onNavigate("signup", "push")}
                    className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[10px] font-bold border border-blue-200/50 transition-colors shadow-sm"
                  >
                    Create New Account (Sign Up)
                  </button>
                  <button
                    type="button"
                    id="guest-btn-from-error"
                    onClick={() => {
                      if (setUserName) setUserName("Tanusree");
                      onNavigate("dashboard", "push");
                    }}
                    className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-[10px] font-bold border border-slate-200 transition-colors"
                  >
                    Skip Sign In (Guest Demo)
                  </button>
                </div>
              </div>
            );
          } else {
            // General login issue - provide clear error message and bypass button
            let cleanErr = errStr;
            if (errStr.includes("AuthRetryableFetchError") || errStr.includes("{}") || errStr.toLowerCase().includes("failed to fetch") || !errStr) {
              cleanErr = "Database connection offline: Supabase project is unconfigured or unreachable. Please verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or use the Bypass option below to enter Guest Mode instantly.";
            }
            msg = (
              <div className="space-y-1.5 text-left" id="general-login-error">
                <p className="font-bold text-rose-700 flex items-center gap-1 text-[13px]">❌ Authentication Issue</p>
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  {cleanErr}
                </p>
                <div className="flex items-center gap-2 pt-1.5">
                  <button
                    type="button"
                    id="bypass-login-btn-general"
                    onClick={() => {
                      if (setUserName) setUserName("Tanusree");
                      onNavigate("dashboard", "push");
                    }}
                    className="px-2.5 py-1 bg-rose-50 text-rose-800 hover:bg-rose-100 rounded-lg text-[10px] font-bold border border-rose-200/50 transition-colors shadow-sm cursor-pointer"
                  >
                    Bypass & Enter Guest Workspace
                  </button>
                </div>
              </div>
            );
          }
          setErrorMessage(msg);
        }
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-900 font-sans p-4 relative overflow-hidden">
      
      {/* Background Photo */}
      <div className="absolute inset-0 z-0">
        <img
          src="/src/assets/images/studentos_login_bg_1783007834381.jpg"
          alt="StudentOS Background"
          className="w-full h-full object-cover select-none pointer-events-none"
          referrerPolicy="no-referrer"
        />
        {/* Subtle blur overlay for card depth */}
        <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[3px]" />
      </div>

      {/* Centered Modern Minimal Card */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md border border-white/20 p-8 sm:p-10 rounded-3xl shadow-2xl relative z-10">
        
        {/* App Logo & Welcome */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <span className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm tracking-tight shadow-md shadow-indigo-600/10">S</span>
            <span className="font-extrabold tracking-tight text-slate-900 text-lg">StudentOS</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight text-center">
            Welcome Back
          </h2>
          <p className="text-slate-400 text-xs mt-1 text-center font-medium">
            Sign in to continue to StudentOS AI.
          </p>
        </div>

        {/* Minimal Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-white px-3 text-slate-400 font-mono font-bold tracking-widest">OR</span>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-semibold leading-relaxed">
              {errorMessage}
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-1">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-sans"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-200 text-indigo-600 focus:ring-indigo-500/20 bg-slate-50 h-3.5 w-3.5"
              />
              <span className="text-[11px] font-bold text-slate-400 select-none group-hover:text-slate-600 transition-colors">Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => onNavigate("forgot_password", "push")}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer focus:outline-none"
            >
              Forgot Password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            id="login-btn"
            type="submit"
            disabled={isAuthenticating}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-indigo-600/10 flex items-center justify-center space-x-2 transition-all cursor-pointer font-sans text-xs mt-2 disabled:opacity-75 focus:outline-none focus:ring-4 focus:ring-indigo-600/10"
          >
            {isAuthenticating ? (
              <span>Logging in...</span>
            ) : (
              <>
                <span>Log In</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="text-center text-slate-400 text-xs font-semibold mt-8">
          Don't have an account?{" "}
          <button
            onClick={() => onNavigate("signup", "push")}
            className="text-indigo-600 hover:text-indigo-700 font-extrabold cursor-pointer underline transition-all ml-1"
          >
            Sign up
          </button>
        </div>

      </div>
    </div>
  );
}
