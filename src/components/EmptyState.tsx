import React from "react";
import { Calendar } from "lucide-react";

interface EmptyStateProps {
  onAddClick?: () => void;
  message?: string;
  buttonText?: string;
}

export default function EmptyState({ onAddClick, message, buttonText }: EmptyStateProps) {
  return (
    <div id="empty-state-schedule" className="p-8 bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl text-center py-10 flex flex-col items-center justify-center">
      <Calendar className="h-10 w-10 text-slate-600 mb-3 animate-pulse" />
      <h3 className="text-sm font-extrabold text-slate-300 font-sans">No schedule found</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed font-sans mb-4">
        {message || "No class schedule added yet"}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={onAddClick}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-lg shadow-indigo-600/10 transition-all cursor-pointer"
        >
          {buttonText || "Add Schedule"}
        </button>
        <button
          onClick={onAddClick}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 px-4 rounded-xl transition-all cursor-pointer"
        >
          Add Class Schedule
        </button>
      </div>
    </div>
  );
}
