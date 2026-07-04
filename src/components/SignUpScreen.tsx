import React, { useState } from "react";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { ScreenID } from "../types";
import { registerUser } from "../lib/supabaseService";
import { initializeEmptyWorkspace } from "../lib/syncEngine";

interface SignUpScreenProps {
  onNavigate: (screen: ScreenID, direction: "none" | "push" | "push_back") => void;
  setUserName?: (name: string) => void;
}

export default function SignUpScreen({ onNavigate, setUserName }: SignUpScreenProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<React.ReactNode | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptTerms) return;
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    setIsRegistering(true);
    setErrorMessage(null);

    try {
      await registerUser(email, password, fullName.trim());
      initializeEmptyWorkspace(fullName.trim());
      if (setUserName && fullName.trim()) {
        setUserName(fullName.trim());
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
          errStr = "The university's registration service is offline or unconfigured.";
        }
      }

      console.warn("SignUp error details:", errStr);

      const isNotAllowed = error?.code === "auth/operation-not-allowed" || errStr.toLowerCase().includes("disabled") || errStr.toLowerCase().includes("not allowed");
      if (isNotAllowed) {
        setErrorMessage(
          <div className="space-y-2">
            <p className="font-bold text-rose-700 flex items-center gap-1">⚠️ Supabase Authentication Setup Required</p>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              The <strong>Email/Password</strong> sign-in method is currently disabled or unconfigured in your Supabase project.
            </p>
            <ol className="list-decimal list-inside text-[11px] text-slate-600 space-y-1.5 pl-1 font-semibold">
              <li>Open your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Supabase Dashboard</a></li>
              <li>Navigate to <strong>Authentication</strong> &rarr; <strong>Providers</strong> &rarr; <strong>Email</strong></li>
              <li>Ensure <strong>Enable Email Signup</strong> is toggled ON and saved</li>
              <li>Verify your <code>.env.example</code> (or local settings) contains valid Supabase URL & Anon Key!</li>
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
            <div className="space-y-1.5 text-left" id="rate-limit-error-signup">
              <p className="font-bold text-amber-700 flex items-center gap-1 text-[13px]">⚠️ Email service rate limit reached</p>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                The university portal's sign-up service is currently rate-limited (too many requests). To avoid waiting, you can skip registration and enter the demo workstation instantly.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  id="bypass-signup-btn"
                  onClick={() => {
                    if (setUserName) setUserName(fullName.trim() || "Tanusree");
                    onNavigate("dashboard", "push");
                  }}
                  className="px-2.5 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-[10px] font-bold border border-amber-200 transition-colors shadow-sm cursor-pointer animate-pulse"
                >
                  Bypass with Instant Demo Profile
                </button>
              </div>
            </div>
          );
        } else {
          // General registration error - provide clear text and instant bypass option to avoid blocks
          let displayMsg = errStr;
          if (errStr.includes("AuthRetryableFetchError") || errStr.includes("{}") || errStr.toLowerCase().includes("failed to fetch") || !errStr) {
            displayMsg = "Database connection offline: Supabase project is unconfigured or unreachable. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or use the Bypass option below to enter Guest Mode instantly.";
          } else if (error?.code === "auth/email-already-in-use" || errStr.toLowerCase().includes("already registered") || errStr.toLowerCase().includes("already-in-use")) {
            displayMsg = "This email is already registered. Please sign in instead.";
          } else if (error?.code === "auth/invalid-email" || errStr.toLowerCase().includes("invalid email")) {
            displayMsg = "Please enter a valid email address.";
          } else if (error?.code === "auth/weak-password" || errStr.toLowerCase().includes("weak-password")) {
            displayMsg = "The password is too weak. It must be at least 6 characters.";
          }

          setErrorMessage(
            <div className="space-y-1.5 text-left" id="general-signup-error">
              <p className="font-bold text-rose-700 flex items-center gap-1 text-[13px]">❌ Registration Issue</p>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                {displayMsg}
              </p>
              <div className="flex items-center gap-2 pt-1.5">
                <button
                  type="button"
                  id="bypass-signup-btn-general"
                  onClick={() => {
                    if (setUserName) setUserName(fullName.trim() || "Tanusree");
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
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const getPasswordStrength = () => {
    if (!password) return { label: "None", color: "bg-slate-200", text: "text-slate-400", percent: 0 };
    if (password.length < 6) return { label: "Weak", color: "bg-red-500", text: "text-red-500", percent: 33 };
    if (password.length < 10) return { label: "Moderate", color: "bg-amber-500", text: "text-amber-500", percent: 66 };
    return { label: "Strong", color: "bg-emerald-500", text: "text-emerald-500", percent: 100 };
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen flex bg-white text-slate-900 font-sans">
      {/* Left Column: Sign Up Form */}
      <div className="w-full lg:w-[55%] flex flex-col justify-between p-6 sm:p-12 md:p-16 bg-[#F8FAFC]">
        {/* Top Header Row / Branding */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm tracking-tight shadow-md shadow-blue-500/20">S</span>
            <span className="font-extrabold tracking-tight text-slate-950 text-lg">StudentOS</span>
          </div>
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400 bg-slate-200/60 px-2.5 py-1 rounded-full">v2.1</span>
        </div>

        {/* Central Card */}
        <div className="w-full max-w-md mx-auto my-auto py-6">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight text-center mb-1">
            Create account
          </h2>
          <p className="text-center text-slate-500 text-xs mb-6">Join StudentOS to elevate your productivity and academic success</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Alert */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-semibold leading-relaxed">
                {errorMessage}
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-1">
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full Name"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-sans shadow-sm"
                />
              </div>
            </div>

            {/* Email field */}
            <div className="space-y-1">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="University Email Address"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-sans shadow-sm"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1">
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-sans shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div className="pt-1 px-1">
                  <div className="flex justify-between items-center text-[10px] mb-1">
                    <span className="text-slate-400 font-sans">Strength:</span>
                    <span className={`${strength.text} font-bold font-mono`}>{strength.label}</span>
                  </div>
                  <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: `${strength.percent}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password field */}
            <div className="space-y-1">
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-sans shadow-sm"
                />
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start space-x-2 pt-1">
              <input
                type="checkbox"
                id="acceptTerms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 bg-white"
              />
              <label htmlFor="acceptTerms" className="text-xs text-slate-500 font-sans select-none leading-relaxed">
                I accept the <a href="#terms" className="text-blue-600 hover:underline font-semibold">Terms & Conditions</a> and acknowledge the <a href="#privacy" className="text-blue-600 hover:underline font-semibold">Privacy Policy</a>.
              </label>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={!acceptTerms || isRegistering}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/15 flex items-center justify-center space-x-2 transition-all cursor-pointer font-sans text-sm mt-3"
            >
              {isRegistering ? (
                <span>Registering...</span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer badges and route navigation */}
        <div className="space-y-6">
          <div className="text-center text-slate-500 text-xs font-semibold">
            Already have an account?{" "}
            <button
              onClick={() => onNavigate("login", "push_back")}
              className="text-blue-600 hover:text-blue-700 font-bold cursor-pointer underline transition-all ml-0.5"
            >
              Sign In
            </button>
            <span className="mx-2 text-slate-300">|</span>
            <button
              onClick={() => onNavigate("signin", "push")}
              className="text-indigo-600 hover:text-indigo-700 font-bold cursor-pointer underline transition-all"
            >
              Alternative Portal
            </button>
          </div>


        </div>
      </div>

      {/* Right Column: Split Screen Brand Illustration matching hummingbird style */}
      <div className="hidden lg:block lg:w-[45%] relative bg-slate-950 overflow-hidden">
        {/* The beautiful generated image */}
        <img
          src="/src/assets/images/studentos_login_bg_1783007834381.jpg"
          alt="StudentOS Workspace Background"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-85 hover:scale-105 transition-transform duration-10000 ease-out"
        />
        
        {/* Artistic overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-slate-950/40" />

        {/* Cursive display phrase exactly matching screenshot layout */}
        <div className="absolute bottom-12 right-12 text-right">
          <p className="text-white font-serif italic text-4xl font-medium tracking-wide drop-shadow-md select-none opacity-90">
            make it real.
          </p>
          <p className="text-slate-300 font-sans tracking-widest text-[10px] uppercase font-bold mt-2 opacity-60">
            StudentOS Ecosystem
          </p>
        </div>
      </div>
    </div>
  );
}
