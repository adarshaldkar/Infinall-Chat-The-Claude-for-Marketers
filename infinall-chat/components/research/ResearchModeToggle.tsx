"use client";

import { Sparkles, Compass } from "lucide-react";

interface ResearchModeToggleProps {
  isDeepResearch: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export default function ResearchModeToggle({
  isDeepResearch,
  onToggle,
  disabled,
}: ResearchModeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title="Toggle Deep Multi-Agent Research Mode"
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
        isDeepResearch
          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/10"
          : "text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-800/80"
      }`}
    >
      <Compass className={`w-3.5 h-3.5 ${isDeepResearch ? "text-cyan-400 animate-spin" : "text-zinc-400"}`} style={{ animationDuration: "12s" }} />
      <span>Deep Research</span>
      {isDeepResearch && (
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse ml-0.5" />
      )}
    </button>
  );
}
