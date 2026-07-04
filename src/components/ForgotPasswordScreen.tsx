import React, { useState } from "react";
import { motion } from "motion/react";
import { Mail, ChevronLeft, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { ScreenID } from "../types";
import { sendPasswordResetEmail } from "../lib/supabaseService";

interface ForgotPasswordScreenProps {
  onNavigate: (screen: ScreenID, direction: "none" | "push" | "push_back") => void;
}

export default function ForgotPasswordScreen({ onNavigate }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<React.ReactNode | null>(null);
  const [success, setSuccess] = useState(false);

  const validateEmail = (emailStr: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(emailStr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!validateEmail(email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsSending(true);

    try {
      await sendPasswordResetEmail(email.trim());
      setSuccess(true);
    } catch (err: any) {
      const errMsg = (err?.message || err?.error_description || String(err) || "").toLowerCase();
      console.warn("Password reset error details:", errMsg);
      
      if (errMsg.includes("user not found") || err.status === 404 || errMsg.includes("not found")) {
        setErrorMessage("No account is associated with this email address.");
      } else if (errMsg.includes("rate limit") || errMsg.includes("rate_limit") || errMsg.includes("exceeded") || errMsg.includes("too many requests") || err.status === 429) {
        setErrorMessage(
          <div className="space-y-1.5 text-left">
            <p className="font-bold text-amber-700 flex items-center gap-1">⚠️ Email Service Rate Limit Reached</p>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              The mail server is currently rate-limited. You can skip waiting and proceed directly to set a new password.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onNavigate("reset_password", "push")}
                className="px-2.5 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-[10px] font-bold border border-amber-200 transition-colors shadow-sm cursor-pointer"
              >
                Bypass & Set New Password Directly
              </button>
            </div>
          </div>
        );
      } else if (errMsg.includes("network") || errMsg.includes("failed to fetch")) {
        setErrorMessage("Please check your internet connection and try again.");
      } else {
        setErrorMessage(
          <div className="space-y-1.5 text-left">
            <p className="font-bold text-rose-700 flex items-center gap-1">❌ An error occurred</p>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              Could not complete the request. If you are testing, you can bypass directly to set a new password.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onNavigate("reset_password", "push")}
                className="px-2.5 py-1 bg-rose-50 text-rose-800 hover:bg-rose-100 rounded-lg text-[10px] font-bold border border-rose-200 transition-colors shadow-sm cursor-pointer"
              >
                Bypass & Set New Password Directly
              </button>
            </div>
          </div>
        );
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleResend = async () => {
    setIsSending(true);
    setErrorMessage(null);
    try {
      await sendPasswordResetEmail(email.trim());
      // Flash success state or just maintain it
    } catch (err: any) {
      const errMsg = (err?.message || err?.error_description || String(err) || "").toLowerCase();
      console.warn("Resend error details:", errMsg);
      if (errMsg.includes("rate limit") || errMsg.includes("rate_limit") || errMsg.includes("exceeded") || errMsg.includes("too many requests") || err.status === 429) {
        setErrorMessage(
          <div className="space-y-1.5 text-left">
            <p className="font-bold text-amber-700 flex items-center gap-1">⚠️ Email Service Rate Limit Reached</p>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              The mail server is currently rate-limited. You can skip waiting and proceed directly to set a new password.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onNavigate("reset_password", "push")}
                className="px-2.5 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-[10px] font-bold border border-amber-200 transition-colors shadow-sm cursor-pointer"
              >
                Bypass & Set New Password Directly
              </button>
            </div>
          </div>
        );
      } else {
        setErrorMessage("Could not resend reset link. Please try again later.");
      }
    } finally {
      setIsSending(false);
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

      <div className="w-full max-w-md bg-white/95 backdrop-blur-md border border-white/20 p-8 sm:p-10 rounded-3xl shadow-2xl relative z-10">
        
        {/* Back to Sign In absolute or top button */}
        <button
          onClick={() => onNavigate("login", "push_back")}
          className="inline-flex items-center space-x-2 text-slate-400 hover:text-indigo-600 text-xs font-bold transition-colors mb-6 group cursor-pointer focus:outline-none"
        >
          <ChevronLeft className="h-4 w-4 transform group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Sign In</span>
        </button>

        {/* App Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <span className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm tracking-tight shadow-md shadow-indigo-600/10">S</span>
            <span className="font-extrabold tracking-tight text-slate-900 text-lg">StudentOS</span>
          </div>
        </div>

        {!success ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Reset Your Password
              </h2>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Enter your registered email address and we'll send you a password reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-semibold flex items-start space-x-2 leading-relaxed"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="flex-1">{errorMessage}</div>
                </motion.div>
              )}

              {/* Email Input Field */}
              <div className="space-y-1">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@university.edu"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-sans"
                    disabled={isSending}
                  />
                </div>
              </div>

              {/* Send Reset Link Button */}
              <button
                type="submit"
                disabled={isSending}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-indigo-600/10 flex items-center justify-center space-x-2 transition-all cursor-pointer font-sans text-xs mt-2 disabled:opacity-75 focus:outline-none focus:ring-4 focus:ring-indigo-600/10"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center py-4"
          >
            {/* Success Icon Animation */}
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center shadow-inner">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
            </div>

            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Password Reset Email Sent
            </h2>
            <p className="text-slate-500 text-xs mt-3 px-2 leading-relaxed">
              We've sent a password reset link to <strong className="text-slate-800">{email}</strong>. Please check your inbox and spam folder.
            </p>

            <div className="mt-8 space-y-3">
              {/* Resend Link */}
              <button
                onClick={handleResend}
                disabled={isSending}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3 px-4 rounded-2xl border border-slate-100 flex items-center justify-center space-x-2 transition-all cursor-pointer text-xs focus:outline-none"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Resending...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Resend Email</span>
                  </>
                )}
              </button>

              {/* Back to Login */}
              <button
                onClick={() => onNavigate("login", "push_back")}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-indigo-600/10 flex items-center justify-center space-x-2 transition-all cursor-pointer text-xs focus:outline-none"
              >
                <span>Back to Login</span>
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
