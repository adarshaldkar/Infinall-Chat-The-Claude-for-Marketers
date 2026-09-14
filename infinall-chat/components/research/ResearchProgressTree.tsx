"use client";

import { useState } from "react";
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
} from "lucide-react";

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

const WORKER_ICON: Record<WorkerKind, React.ElementType> = {
  competitor: TrendingUp,
  pricing: DollarSign,
  serp: Search,
  creative: Sparkles,
  general: Compass,
};

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

  return (
    <div
      className="rounded-2xl border p-4 space-y-3 shadow-lg"
      style={{
        borderColor: "var(--color-border)",
        background: "rgba(15, 23, 42, 0.4)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Compass className="w-4 h-4 animate-spin" style={{ animationDuration: "10s" }} />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
              <span>Deep Multi-Agent Research Orchestrator</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                {isComplete ? "Completed" : `${completedCount}/${workers.length} Subagents Finished`}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Parallel subagent worker threads gathering market intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Worker List */}
      <div className="space-y-2">
        {workers.map((worker) => {
          const Icon = WORKER_ICON[worker.workerKind] || Compass;
          const isExpanded = !!expandedIds[worker.id];
          const isDone = worker.status === "done";
          const isRunning = worker.status === "running" || worker.status === "pending";
          const isErr = worker.status === "error";

          return (
            <div
              key={worker.id}
              className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 overflow-hidden text-xs transition-all"
            >
              <button
                onClick={() => toggleExpand(worker.id)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-zinc-900/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1 rounded bg-zinc-800 text-zinc-300">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-200 truncate">{worker.name}</div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      {worker.stepMessage || "Analyzing..."}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {isRunning && (
                    <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium font-mono">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Running
                    </span>
                  )}
                  {isDone && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {worker.finding?.sources.length || 0} Sources
                    </span>
                  )}
                  {isErr && (
                    <span className="flex items-center gap-1 text-[11px] text-rose-400 font-medium font-mono">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Failed
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && worker.finding && (
                <div className="p-3 border-t border-zinc-800/80 bg-zinc-950 space-y-2.5">
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    {worker.finding.summary}
                  </p>

                  {worker.finding.dataPoints && worker.finding.dataPoints.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {worker.finding.dataPoints.map((dp, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 text-[11px]"
                        >
                          <span className="text-zinc-500 block">{dp.key}</span>
                          <span className="text-zinc-200 font-medium font-mono mt-0.5 block truncate">
                            {dp.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {worker.finding.sources.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold uppercase text-zinc-500">
                        Citations & Sources
                      </span>
                      <div className="space-y-1">
                        {worker.finding.sources.slice(0, 3).map((src) => (
                          <a
                            key={src.id}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-1.5 rounded bg-zinc-900/40 hover:bg-zinc-800 border border-zinc-800/50 text-[11px] text-zinc-300 transition-colors"
                          >
                            <span className="truncate">{src.title}</span>
                            <ExternalLink className="w-3 h-3 text-cyan-400 ml-2 shrink-0" />
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

      {/* Synthesis Milestone */}
      {isSynthesizing && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-xs text-cyan-300 animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          <span>Cross-verifying claims and synthesizing unified executive intelligence report...</span>
        </div>
      )}
    </div>
  );
}
