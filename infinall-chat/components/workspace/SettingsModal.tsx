"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Settings,
  Shield,
  Trash2,
  RotateCcw,
  Download,
  Check,
  AlertTriangle,
  Sparkles,
  Zap,
  HardDrive,
  Cpu,
} from "lucide-react";
import {
  getStoredSessions,
  getArchivedSessions,
  archiveAllSessions,
  restoreArchivedSessions,
  exportAllDataAsJSON,
} from "@/lib/state/session-store";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshSessions?: () => void;
  onOpenCreateSkill?: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  onRefreshSessions,
  onOpenCreateSkill,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"general" | "retention" | "skills">("retention");
  const [activeCount, setActiveCount] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const refreshCounts = () => {
    setActiveCount(getStoredSessions().length);
    setArchivedCount(getArchivedSessions().length);
  };

  useEffect(() => {
    if (isOpen) {
      refreshCounts();
      setIsConfirmingDelete(false);
      setFeedbackMsg(null);
    }
  }, [isOpen]);

  const handleArchiveAll = () => {
    const res = archiveAllSessions();
    refreshCounts();
    setIsConfirmingDelete(false);
    setFeedbackMsg({
      type: "success",
      text: `Successfully soft-deleted ${res.count} conversations. They will be retained for 30 days and can be restored anytime.`,
    });
    if (onRefreshSessions) onRefreshSessions();
  };

  const handleRestoreAll = () => {
    const res = restoreArchivedSessions();
    refreshCounts();
    setFeedbackMsg({
      type: "success",
      text: `Restored ${res.restoredCount} conversations from the 30-day retention archive.`,
    });
    if (onRefreshSessions) onRefreshSessions();
  };

  const handleExportJSON = () => {
    exportAllDataAsJSON();
    setFeedbackMsg({
      type: "success",
      text: "Exported all conversation histories and artifacts to JSON.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 p-0 overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="p-5 pb-3 border-b border-zinc-800/80 bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-zinc-100">
                Workspace Settings & Data Governance
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                Manage AI defaults, custom marketing skills, and 30-day conversation retention.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-zinc-800/80 bg-zinc-900/30">
          <button
            onClick={() => setActiveTab("retention")}
            className={`flex items-center gap-1.5 pb-2 px-1 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "retention"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Data & 30-Day Retention</span>
          </button>
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-1.5 pb-2 px-1 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "general"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>AI Gateway & Models</span>
          </button>
          <button
            onClick={() => setActiveTab("skills")}
            className={`flex items-center gap-1.5 pb-2 px-1 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "skills"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Skills & Workflows</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {feedbackMsg && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                feedbackMsg.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
              }`}
            >
              <span>{feedbackMsg.text}</span>
              <button
                onClick={() => setFeedbackMsg(null)}
                className="text-zinc-400 hover:text-zinc-200 ml-2 text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Retention Tab */}
          {activeTab === "retention" && (
            <div className="space-y-4">
              {/* Stats card */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40">
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                    <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Active Conversations</span>
                  </div>
                  <div className="text-xl font-bold text-zinc-100 font-mono">{activeCount}</div>
                </div>
                <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40">
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span>In 30-Day Retention</span>
                  </div>
                  <div className="text-xl font-bold text-amber-400 font-mono">{archivedCount}</div>
                </div>
              </div>

              {/* Policy Explanation */}
              <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-200">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span>30-Day Soft-Delete Retention Policy</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Infinall adheres to enterprise privacy and safety standards (PRD Section 11.4). When you delete individual conversations or perform a bulk wipe, data is quarantined in a secure 30-day soft-delete vault before permanent purge. You can undo and restore archived chats at any point during this window.
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-2.5 pt-2">
                {/* Restore / Undo button */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40">
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">Restore Archived History</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Recover {archivedCount} soft-deleted conversations back to your active sidebar.
                    </div>
                  </div>
                  <button
                    onClick={handleRestoreAll}
                    disabled={archivedCount === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-200 transition-colors border border-zinc-700/60"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Restore ({archivedCount})</span>
                  </button>
                </div>

                {/* Export Backup */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40">
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">Export All Data (JSON)</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Download a structured JSON archive of all active and soft-deleted chats with deliverables.
                    </div>
                  </div>
                  <button
                    onClick={handleExportJSON}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors border border-zinc-700/60"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download JSON</span>
                  </button>
                </div>

                {/* Delete all history with confirmation */}
                <div className="p-3.5 rounded-xl border border-rose-900/30 bg-rose-950/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-rose-400">Delete All Conversations</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Soft-deletes all active chats into the 30-day retention quarantine.
                      </div>
                    </div>

                    {!isConfirmingDelete ? (
                      <button
                        onClick={() => setIsConfirmingDelete(true)}
                        disabled={activeCount === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete All History</span>
                      </button>
                    ) : null}
                  </div>

                  {isConfirmingDelete && (
                    <div className="p-3 rounded-lg bg-rose-900/20 border border-rose-500/30 space-y-2 animate-in fade-in duration-100">
                      <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Are you sure? This will archive {activeCount} conversations.</span>
                      </div>
                      <p className="text-[11px] text-zinc-300">
                        You can undo this at any time from this Settings dialog within 30 days.
                      </p>
                      <div className="flex items-center gap-2 pt-1 justify-end">
                        <button
                          onClick={() => setIsConfirmingDelete(false)}
                          className="px-3 py-1 rounded text-xs text-zinc-300 hover:bg-zinc-800 transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleArchiveAll}
                          className="px-3 py-1 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm"
                        >
                          Confirm & Soft Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI Gateway Tab */}
          {activeTab === "general" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
                <div className="text-xs font-semibold text-zinc-200">Active Model Roster (PRD Compliant)</div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="font-mono text-cyan-400">⚡ Auto</span>
                    <span className="text-zinc-400">Dynamic Intent & Complexity Router</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="font-mono text-zinc-200">Claude Sonnet 4.6</span>
                    <span className="text-zinc-400">Primary Workhorse (Campaigns, Code, Fast Reasoning)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="font-mono text-zinc-200">Claude Opus 5</span>
                    <span className="text-zinc-400">Deep Multi-Channel Strategy & Research Synthesis</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="font-mono text-zinc-200">GPT-5.6</span>
                    <span className="text-zinc-400">Fast Structured JSON, CSV & Cross-Model Verification</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Skills Tab */}
          {activeTab === "skills" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
                <div>
                  <div className="text-xs font-semibold text-zinc-200">Custom Marketing Skills</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Create domain-specific prompts and frameworks triggerable via / slash commands.
                  </div>
                </div>
                {onOpenCreateSkill && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenCreateSkill();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>+ New Skill</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/30 flex items-center justify-between shrink-0">
          <span className="text-xs text-zinc-500 font-mono">Infinall Platform v1.2 · Enterprise Tier</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 transition"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
