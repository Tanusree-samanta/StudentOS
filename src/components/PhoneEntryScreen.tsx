import React, { useState, useEffect } from "react";
import { ChevronLeft, ArrowRight, Phone, MessageSquare, GraduationCap } from "lucide-react";
import { ScreenID } from "../types";

interface PhoneEntryScreenProps {
  onNavigate: (screen: ScreenID, direction: "none" | "push" | "push_back") => void;
}

export default function PhoneEntryScreen({ onNavigate }: PhoneEntryScreenProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [secondsLeft, setSecondsLeft] = useState(59);
  const [codeSent, setCodeSent] = useState(false);

  useEffect(() => {
    if (!codeSent || secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft, codeSent]);

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    setCodeSent(true);
    setSecondsLeft(59);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate("dashboard", "push");
  };

  const handleOtpChange = (index: number, val: string) => {
    if (isNaN(Number(val))) return;
    const newOtp = [...otp];
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);

    // Auto focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 grid-bg relative overflow-hidden px-4">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Back Button */}
        <button
          onClick={() => onNavigate("login", "push_back")}
          className="inline-flex items-center space-x-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors mb-6 group cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4 transform group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Sign In</span>
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.15)] mb-3">
            <Phone className="h-9 w-9 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight font-sans">
            Phone <span className="text-indigo-400">Verification</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">Multi-factor secure enrollment workstation</p>
        </div>

        {/* Phone Entry Card */}
        <div className="glass-panel-glow rounded-3xl p-8 relative overflow-hidden">
          {!codeSent ? (
            <form onSubmit={handleSendCode} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-sans">Phone Number</label>
                <div className="flex space-x-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-indigo-500/50 font-sans"
                  >
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+81">🇯🇵 +81</option>
                    <option value="+49">🇩🇪 +49</option>
                  </select>
                  <input
                    type="tel"
                    required
                    placeholder="(555) 000-0000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-900/40 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm font-sans"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer font-sans text-sm"
              >
                <span>Send One-Time Code</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-sans">Verification Code</label>
                  <span className="text-xs text-slate-500 font-mono">Sent to {countryCode} {phoneNumber}</span>
                </div>

                {/* OTP digit inputs */}
                <div className="grid grid-cols-6 gap-2">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      maxLength={1}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      required
                      className="w-full h-12 bg-slate-900/60 border border-slate-800 rounded-xl text-center text-xl font-bold font-mono text-indigo-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                    />
                  ))}
                </div>
              </div>

              {/* Verify Button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer font-sans text-sm"
              >
                <span>Verify & Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              {/* Timer/Resend */}
              <div className="text-center text-xs text-slate-500 font-sans">
                {secondsLeft > 0 ? (
                  <span className="font-mono">Resend code in 0:{secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSecondsLeft(59);
                      setCodeSent(true);
                    }}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer underline"
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
