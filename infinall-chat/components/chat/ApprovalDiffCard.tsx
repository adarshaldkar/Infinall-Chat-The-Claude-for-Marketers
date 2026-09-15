"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Check, X, Clock, MessageSquare, Send } from "lucide-react";

interface ApprovalDiffCardProps {
  sessionId: string | null;
  approval: {
    executionId: string;
    toolName: string;
    actionSummary: string;
    diff: {
      account?: string;
      campaignName?: string;
      budgetChange?: string;
      audienceTargeting?: string;
      dailySpend?: string;
      rawParams?: Record<string, unknown>;
    };
    expiresAt: number;
    argsHash?: string;
  };
}

export default function ApprovalDiffCard({ approval, sessionId }: ApprovalDiffCardProps) {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [timeLeft, setTimeLeft] = useState<string>("05:00");
  const [isExpired, setIsExpired] = useState(false);

  const { diff } = approval;

  // Live countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const remainingMs = approval.expiresAt - Date.now();
      if (remainingMs <= 0) {
        setIsExpired(true);
        setTimeLeft("00:00");
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        setTimeLeft(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [approval.expiresAt]);

  const handleApprove = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chat/approval/resume", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          executionId: approval.executionId,
          sessionId: sessionId ?? "",
          argsHash: approval.argsHash ?? "",
          action: "approve",
        }),
      });
      if (res.ok) {
        setStatus("approved");
      }
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (reason?: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/chat/approval/reject", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          executionId: approval.executionId,
          sessionId: sessionId ?? "",
          reason: reason || feedbackText,
        }),
      });
      if (res.ok) {
        setStatus("rejected");
      }
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  if (status === "approved") {
    return (
      <div
        className="flex items-center gap-2 px-4 py-3 rounded-xl border text-sm"
        style={{ borderColor: "rgba(34,197,94,0.4)", background: "rgba(34,197,94,0.08)", color: "#4ade80" }}
      >
        <Check className="w-4 h-4" />
        <span>Mutation approved & executed successfully: <strong>{approval.actionSummary}</strong></span>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div
        className="flex flex-col gap-1 px-4 py-3 rounded-xl border text-sm"
        style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#f87171" }}
      >
        <div className="flex items-center gap-2">
          <X className="w-4 h-4" />
          <span>Action rejected by user.</span>
        </div>
        {feedbackText && (
          <p className="text-xs text-zinc-400 pl-6">
            Feedback sent to agent: &ldquo;{feedbackText}&rdquo;
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border overflow-hidden shadow-lg"
      style={{ borderColor: "rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.05)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: "rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.08)" }}
      >
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-semibold text-amber-300">
          Mutation Approval Required
        </span>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-amber-200/80 font-mono">
          <Clock className="w-3.5 h-3.5" />
          <span>{isExpired ? "EXPIRED" : `Expires in ${timeLeft}`}</span>
        </div>
      </div>

      {/* Diff Table */}
      <div className="px-4 py-3 space-y-2">
        <div className="text-xs font-mono text-zinc-400">
          Target Action: <span className="text-zinc-200 font-semibold">{approval.actionSummary}</span>
        </div>
        {diff.campaignName && <DiffRow label="Campaign" value={diff.campaignName} />}
        {diff.account && <DiffRow label="Account" value={diff.account} />}
        {diff.budgetChange && <DiffRow label="Budget Change" value={diff.budgetChange} highlight />}
        {diff.dailySpend && <DiffRow label="Daily Spend" value={diff.dailySpend} />}
        {diff.audienceTargeting && <DiffRow label="Audience" value={diff.audienceTargeting} />}
      </div>

      {/* Reject with Feedback Textarea */}
      {showFeedback && (
        <div className="px-4 py-3 border-t border-amber-500/20 bg-black/20 space-y-2">
          <label className="text-xs text-zinc-300 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            Provide adjustment feedback for the agent:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="e.g. Daily budget is too high, cap at $300 instead..."
              className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={() => handleReject(feedbackText)}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/80 text-white hover:bg-red-500 transition-colors flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              Submit
            </button>
          </div>
        </div>
      )}

      {/* Actions Toolbar */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-t"
        style={{ borderColor: "rgba(245,158,11,0.2)" }}
      >
        <button
          onClick={() => setShowFeedback(!showFeedback)}
          disabled={loading || isExpired}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {showFeedback ? "Hide Feedback" : "Reject with Feedback"}
        </button>
        <button
          onClick={() => handleReject()}
          disabled={loading || isExpired}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" />
          Reject
        </button>
        <button
          onClick={handleApprove}
          disabled={loading || isExpired}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-black hover:bg-amber-400 transition-colors disabled:opacity-50 ml-auto shadow-md"
        >
          <Check className="w-3.5 h-3.5" />
          {loading ? "Executing..." : "Approve & Execute Spend"}
        </button>
      </div>
    </div>
  );
}

function DiffRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-zinc-800/60">
      <span className="text-xs text-zinc-400">{label}</span>
      <span className={`text-xs font-medium ${highlight ? "text-amber-300 font-semibold" : "text-zinc-200"}`}>
        {value}
      </span>
    </div>
  );
}
