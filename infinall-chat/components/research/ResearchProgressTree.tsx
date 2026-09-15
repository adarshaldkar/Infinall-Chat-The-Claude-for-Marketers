"use client";

// ============================================================
// ResearchProgressTree Component
// Executive-Grade Multi-Agent Intelligence Progress & Findings Viewer
// Rendered with rich typography, markdown formatting, and structured metrics
// ============================================================

import React, { useState } from "react";
import { SubagentFinding, WorkerKind } from "@/lib/subagents/types";
import {
  Compass,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Search,
  Sparkles,
  Layers,
  Globe,
  Clock,
} from "lucide-react";
import { renderMarkdownToHtml } from "@/lib/utils/markdown";

export interface ResearchWorkerStatus {
  id: string;
  name: string;
  workerKind: WorkerKind;
  status: "pending" | "running" | "done" | "error";
  stepMessage?: string;
  finding?: SubagentFinding;
  error?: string;
}

interface ResearchProgressTreeProps {
  workers: ResearchWorkerStatus[];
  isSynthesizing?: boolean;
  isComplete?: boolean;
}

const WORKER_THEME: Record<
  WorkerKind,
  { icon: React.ElementType; color: string; bg: string; border: string; label: string }
> = {
  competitor: {
    icon: TrendingUp,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    label: "Competitor Intelligence",
  },
  pricing: {
    icon: DollarSign,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    label: "Pricing & Packaging",
  },
  serp: {
    icon: Search,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    label: "Search & Demand",
  },
  creative: {
    icon: Sparkles,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    label: "Creative Strategy",
  },
  general: {
    icon: Compass,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    label: "Deep Research",
  },
};

function formatWorkerTitle(name: string): string {
  // Strip awkward duplicated prompt strings like (Deep research X...Deep resear)
  return name
    .replace(/\s*\([^)]*deep research[^)]*\)/gi, "")
    .replace(/\s*\([^)]*\.\.\.[^)]*\)/g, "")
    .trim();
}

export default function ResearchProgressTree({
  workers,
  isSynthesizing,
  isComplete,
}: ResearchProgressTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (workers.length === 0 && !isSynthesizing) return null;

  const completedCount = workers.filter((w) => w.status === "done").length;
  const progressPercentage = Math.round((completedCount / Math.max(1, workers.length)) * 100);

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 shadow-2xl overflow-hidden my-3 divide-y divide-neutral-800/60 backdrop-blur-md">
      {/* Header Banner */}
      <div className="p-4 bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-950 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-sm">
              <Compass className={`w-4 h-4 ${!isComplete ? "animate-spin" : ""}`} style={{ animationDuration: "12s" }} />
            </div>
            <div>
              <div className="text-xs font-semibold text-neutral-100 flex items-center gap-2">
                <span>Multi-Agent Research Orchestrator</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium border ${
                    isComplete
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
                  }`}
                >
                  {isComplete ? "Complete" : `${completedCount}/${workers.length} Subagents Finished`}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Concurrent research subagents gathering verified market & competitor data
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-neutral-800/80 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-500 h-full transition-all duration-500 rounded-full"
            style={{ width: `${isComplete ? 100 : Math.max(15, progressPercentage)}%` }}
          />
        </div>
      </div>

      {/* Subagent Workers List */}
      <div className="p-3 space-y-2.5 bg-neutral-950/40">
        {workers.map((worker) => {
          const theme = WORKER_THEME[worker.workerKind] || WORKER_THEME.general;
          const Icon = theme.icon;
          const isExpanded = !!expandedIds[worker.id];
          const isDone = worker.status === "done";
          const isRunning = worker.status === "running" || worker.status === "pending";
          const isErr = worker.status === "error";
          const cleanTitle = formatWorkerTitle(worker.name);

          return (
            <div
              key={worker.id}
              className={`rounded-xl border transition-all overflow-hidden ${
                isExpanded
                  ? "bg-neutral-900 border-neutral-700/80 shadow-md"
                  : "bg-neutral-900/50 border-neutral-800/80 hover:border-neutral-700"
              }`}
            >
              {/* Card Toggle Bar */}
              <button
                onClick={() => toggleExpand(worker.id)}
                className="w-full flex items-center justify-between p-3.5 text-left transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-lg ${theme.bg} ${theme.border} border ${theme.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-neutral-200 flex items-center gap-2">
                      <span className="truncate">{cleanTitle}</span>
                      <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded font-medium ${theme.bg} ${theme.color}`}>
                        {theme.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {worker.stepMessage || (isDone ? "Findings verified" : "Gathering market data...")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 ml-3">
                  {isRunning && (
                    <span className="flex items-center gap-1.5 text-[11px] text-amber-400 font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Researching
                    </span>
                  )}
                  {isDone && (
                    <div className="flex items-center gap-2">
                      {worker.finding?.executionTimeMs && (
                        <span className="text-[10px] text-neutral-500 flex items-center gap-1 font-mono">
                          <Clock className="w-2.5 h-2.5" />
                          {(worker.finding.executionTimeMs / 1000).toFixed(1)}s
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        {worker.finding?.sources.length || 0} Sources
                      </span>
                    </div>
                  )}
                  {isErr && (
                    <span className="flex items-center gap-1 text-[11px] text-rose-400 font-medium px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                      <AlertCircle className="w-3 h-3" />
                      Failed
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-neutral-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  )}
                </div>
              </button>

              {/* Expanded Findings Content */}
              {isExpanded && worker.finding && (
                <div className="p-4 border-t border-neutral-800/80 bg-neutral-950/70 space-y-4 text-xs">
                  {/* Formatted Markdown Body */}
                  <div
                    className="prose-infinall leading-relaxed text-neutral-200 text-xs space-y-2"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdownToHtml(worker.finding.summary),
                    }}
                  />

                  {/* Key Takeaways / Data Points Grid */}
                  {worker.finding.dataPoints && worker.finding.dataPoints.length > 0 && (
                    <div className="pt-2 border-t border-neutral-800/60">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1.5">
                        <Layers className="w-3 h-3 text-cyan-400" />
                        Key Extracted Signals
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {worker.finding.dataPoints.map((dp, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800/90 text-xs space-y-1"
                          >
                            <span className="text-[10px] text-neutral-400 font-medium block uppercase tracking-wide">
                              {String(dp.key || '').replace(/[*_#]/g, "")}
                            </span>
                            <span className="text-neutral-200 font-medium block">
                              {String(dp.value || '').replace(/[*_#]/g, "")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sources & Citations */}
                  {worker.finding.sources.length > 0 && (
                    <div className="pt-2 border-t border-neutral-800/60">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-indigo-400" />
                        Verified Sources ({worker.finding.sources.length})
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {worker.finding.sources.slice(0, 6).map((src) => (
                          <a
                            key={src.id}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2 rounded-xl bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800/70 text-neutral-300 transition-all group"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="text-[11px] font-medium text-neutral-200 group-hover:text-cyan-400 truncate">
                                {src.title}
                              </div>
                              <div className="text-[10px] text-neutral-500 font-mono truncate">
                                {src.domain}
                              </div>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-neutral-500 group-hover:text-cyan-400 shrink-0 transition" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Live Synthesis Banner */}
      {isSynthesizing && (
        <div className="p-3.5 bg-gradient-to-r from-cyan-950/40 via-indigo-950/40 to-neutral-900 border-t border-cyan-800/30 flex items-center gap-3 text-xs text-cyan-300">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold text-neutral-100 block">Synthesizing Master Intelligence Report</span>
            <span className="text-[11px] text-neutral-400">Cross-verifying competitor claims and building executive comparison matrix...</span>
          </div>
        </div>
      )}
    </div>
  );
}
