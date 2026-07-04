import React, { useState } from "react";
import { motion } from "motion/react";
import { Lock, Eye, EyeOff, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { ScreenID } from "../types";
import { updateUserPassword } from "../lib/supabaseService";

interface ResetPasswordScreenProps {
  onNavigate: (screen: ScreenID, direction: "none" | "push" | "push_back") => void;
}

export default function ResetPasswordScreen({ onNavigate }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!password) {
      setErrorMessage("Please enter a new password.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsUpdating(true);

    try {
      await updateUserPassword(password);
      setSuccess(true);
    } catch (err: any) {
      const errMsg = (err?.message || String(err) || "").toLowerCase();
      console.warn("Password update error details:", errMsg);
      if (errMsg.includes("network") || errMsg.includes("failed to fetch")) {
        setErrorMessage("Please check your internet connection and try again.");
      } else if (errMsg.includes("rate limit") || errMsg.includes("too many requests")) {
        setErrorMessage("Too many requests. Please wait a few minutes before trying again.");
      } else {
        setErrorMessage("Something went wrong. Please try again later.");
      }
    } finally {
      setIsUpdating(false);
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
                Set New Password
              </h2>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Type your new secure password below to complete the reset process.
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
                  <span>{errorMessage}</span>
                </motion.div>
              )}

              {/* Password Input */}
              <div className="space-y-1">
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New Password"
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-sans"
                    disabled={isUpdating}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-1">
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm New Password"
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-sans"
                    disabled={isUpdating}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isUpdating}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-indigo-600/10 flex items-center justify-center space-x-2 transition-all cursor-pointer font-sans text-xs mt-2 disabled:opacity-75 focus:outline-none focus:ring-4 focus:ring-indigo-600/10"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Update Password</span>
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
            {/* Success Icon */}
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center shadow-inner">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
            </div>

            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Password Updated Successfully
            </h2>
            <p className="text-slate-500 text-xs mt-3 px-2 leading-relaxed">
              Your password has been securely updated. You can now log in using your new credentials.
            </p>

            <div className="mt-8">
              <button
                onClick={() => onNavigate("login", "push_back")}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-indigo-600/10 flex items-center justify-center space-x-2 transition-all cursor-pointer text-xs focus:outline-none"
              >
                <span>Back to Login</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
