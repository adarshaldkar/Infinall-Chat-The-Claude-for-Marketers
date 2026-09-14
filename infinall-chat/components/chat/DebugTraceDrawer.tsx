"use client";

import React from "react";
import { X, Activity, Cpu, ShieldCheck, Zap } from "lucide-react";

interface DebugTraceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSessionId: string | null;
  messageCount: number;
  hasArtifact: boolean;
  modelInUse?: string;
}

export default function DebugTraceDrawer({
  isOpen,
  onClose,
  activeSessionId,
  messageCount,
  hasArtifact,
  modelInUse = "claude-sonnet-4-6",
}: DebugTraceDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 rounded-2xl border border-zinc-700 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-xl text-xs text-zinc-300 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-white tracking-wide">Infinall Telemetry & Trace</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-500">⌘+⌥+D</span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-3 pt-3">
        {/* Gateway & Model Status */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-zinc-400">LLM Engine:</span>
          </div>
          <span className="font-mono text-amber-300 font-medium">{modelInUse}</span>
        </div>

        {/* Security & Approvals */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-zinc-400">Approval Guard:</span>
          </div>
          <span className="font-mono text-emerald-400 font-medium">HMAC-SHA256 (Fail-Closed)</span>
        </div>

        {/* Prompt Caching */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-zinc-400">Cache Control:</span>
          </div>
          <span className="font-mono text-cyan-300 font-medium">Ephemeral 5-Min Warm</span>
        </div>

        {/* Session Stats */}
        <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 space-y-1.5 font-mono text-[11px]">
          <div className="flex justify-between">
            <span className="text-zinc-500">Session ID:</span>
            <span className="text-zinc-300 truncate max-w-[180px]">{activeSessionId || "None"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Messages in Context:</span>
            <span className="text-zinc-200">{messageCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Universal Artifact:</span>
            <span className={hasArtifact ? "text-emerald-400" : "text-zinc-500"}>
              {hasArtifact ? "Mounted (Active)" : "None"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Tools Directory:</span>
            <span className="text-zinc-200">54 Catalogued · 6 Live MCPs</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1">
          <span>Latency: ~340ms TTFT</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            Stream Nominal
          </span>
        </div>
      </div>
    </div>
  );
}
