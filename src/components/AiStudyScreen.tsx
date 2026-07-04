import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Bot,
  User,
  Plus,
  Search,
  MessageSquare,
  ChevronRight,
  GraduationCap,
  BookOpen
} from "lucide-react";
import { ScreenID, ChatSession, ChatMessage } from "../types";
import Sidebar from "./Sidebar";

interface AiStudyScreenProps {
  onNavigate: (screen: ScreenID, direction: "none" | "push" | "push_back") => void;
  sessions: ChatSession[];
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
}

export default function AiStudyScreen({ onNavigate, sessions, setSessions }: AiStudyScreenProps) {
  const [activeSessionId, setActiveSessionId] = useState(sessions[0]?.id || "");
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    // Optimistically update local message list
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSessionId) return s;
        return {
          ...s,
          messages: [...s.messages, userMsg]
        };
      })
    );

    setInputMessage("");
    setIsLoading(true);

    try {
      // Collect message history in format the server expects
      const currentHistory = activeSession ? activeSession.messages.map(m => ({
        role: m.role,
        text: m.text
      })) : [];

      const response = await fetch("/api/study-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: currentHistory
        })
      });

      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: "model",
        text: data.text || "I was unable to formulate an answer. Please review your credentials.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== activeSessionId) return s;
          return {
            ...s,
            messages: [...s.messages, aiMsg]
          };
        })
      );
    } catch (err) {
      console.error("AI Assistant API Error:", err);
      // fallback mock message
      const fallbackMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: "model",
        text: "Apologies, I encountered an offline error. Ensure your server is active and try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== activeSessionId) return s;
          return { ...s, messages: [...s.messages, fallbackMsg] };
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewSession = () => {
    const newSess: ChatSession = {
      id: Math.random().toString(36).substring(7),
      title: "New AI Study Thread",
      messages: [
        {
          id: "init",
          role: "model",
          text: "Welcome to a fresh academic exploration! Ask me anything regarding your course materials, code development, or mathematical models.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]
    };

    setSessions((prev) => [newSess, ...prev]);
    setActiveSessionId(newSess.id);
  };

  const suggestionChips = [
    { label: "Explain Backpropagation", query: "Explain Backpropagation in neural networks from a mathematical perspective" },
    { label: "Normal Forms Cheat Sheet", query: "Can you provide a fast summary sheet of 1NF, 2NF, 3NF, and BCNF database structures?" },
    { label: "Explain CPU Scheduling", query: "Summarize Preemptive CPU Scheduling and compare Round Robin vs SRTF" },
    { label: "Binary Tree Search Code", query: "Write a clean JavaScript recursive function to perform binary search in a binary search tree" }
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden grid-bg">
      {/* Sidebar Navigation */}
      <Sidebar currentScreen="ai_study" onNavigate={onNavigate} />

      {/* Main Workspace split: Thread Side Panel & Active Chat */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Threads panel (Left section) */}
        <div className="w-80 bg-slate-950/40 border-r border-slate-900 flex flex-col h-full shrink-0">
          <div className="p-6 border-b border-slate-900/40 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-extrabold tracking-wider text-slate-300 uppercase font-mono">Study Threads</h2>
              <button
                onClick={handleCreateNewSession}
                className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/10 transition-all cursor-pointer"
                title="New Chat Session"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Simulated search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search transcripts..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900/40 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {sessions.map((sess) => {
              const isSelected = sess.id === activeSessionId;
              const lastMsg = sess.messages[sess.messages.length - 1]?.text || "";

              return (
                <div
                  key={sess.id}
                  onClick={() => setActiveSessionId(sess.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-indigo-500/10 border-indigo-500/20"
                      : "bg-transparent border-transparent hover:border-slate-800/80"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <MessageSquare className={`h-4.5 w-4.5 shrink-0 ${isSelected ? "text-indigo-400" : "text-slate-500"}`} />
                    <div className="truncate flex-1">
                      <p className={`text-xs font-bold font-sans truncate ${isSelected ? "text-white" : "text-slate-300"}`}>
                        {sess.title}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate font-sans mt-0.5">{lastMsg}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Workspace (Right section) */}
        <div className="flex-1 flex flex-col h-full bg-slate-950/20">
          
          {/* Thread Header */}
          <div className="p-6 border-b border-slate-900/40 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <Bot className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white font-sans">{activeSession?.title}</h2>
                <p className="text-[10px] text-slate-400 font-sans mt-0.5">Autonomous Study Workspace • Powered by Gemini 3.5</p>
              </div>
            </div>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeSession?.messages.map((msg) => {
              const isAi = msg.role === "model";
              return (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-4 max-w-3xl ${isAi ? "mr-auto" : "ml-auto flex-row-reverse space-x-reverse"}`}
                >
                  {/* Icon Avatar */}
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center border shrink-0 ${
                      isAi ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : "bg-violet-500/10 border-violet-500/20 text-violet-400"
                    }`}
                  >
                    {isAi ? <Bot className="h-4.5 w-4.5" /> : <User className="h-4.5 w-4.5" />}
                  </div>

                  {/* Message Bubble */}
                  <div className={`space-y-1 ${isAi ? "" : "text-right"}`}>
                    <div
                      className={`px-4.5 py-3 rounded-2xl text-xs leading-relaxed font-sans ${
                        isAi
                          ? "bg-slate-900/65 text-slate-200 border border-slate-900/80 whitespace-pre-line"
                          : "bg-indigo-500 text-white font-medium shadow-md shadow-indigo-500/5 text-left"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 block px-1">{msg.timestamp}</span>
                  </div>
                </div>
              );
            })}

            {/* AI Loading state */}
            {isLoading && (
              <div className="flex items-start space-x-4 max-w-3xl mr-auto">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center animate-pulse">
                  <Bot className="h-4.5 w-4.5" />
                </div>
                <div className="px-4.5 py-3 rounded-2xl bg-slate-900/40 border border-slate-900/60 text-xs text-slate-400 font-sans flex items-center space-x-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span>Structuring response index...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Suggestion Chips and Input Bar */}
          <div className="p-6 border-t border-slate-900/40 space-y-4 bg-slate-950/80">
            {/* suggestion chips */}
            {activeSession?.messages.length === 1 && (
              <div className="flex flex-wrap gap-2.5">
                {suggestionChips.map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(chip.query)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold font-sans cursor-pointer transition-colors"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputMessage);
              }}
              className="flex items-center space-x-2 bg-slate-900/45 border border-slate-800/85 p-1.5 rounded-2xl"
            >
              <input
                type="text"
                placeholder="Ask anything about your studies (notes, scheduling, equations)..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isLoading}
                className="flex-1 bg-transparent px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-0"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="p-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:pointer-events-none text-white transition-all cursor-pointer shadow-md shadow-indigo-500/10"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
