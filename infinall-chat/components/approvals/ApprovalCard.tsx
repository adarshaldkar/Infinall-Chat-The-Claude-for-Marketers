'use client';

// ============================================================
// Infinall Chat - Approval Request Card
// Interactive approval card with mutation payload diff, cost indicator & reviewer controls
// ============================================================

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  DollarSign,
  Check,
  X,
  Clock,
  ChevronDown,
  ChevronUp,
  FileCode,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { ApprovalRequest, IMPACT_CONFIG, ApprovalStatus } from '@/lib/security/approval-types';

interface ApprovalCardProps {
  request: ApprovalRequest;
  onApprove: (id: string, notes?: string) => Promise<void>;
  onReject: (id: string, reason?: string) => Promise<void>;
  onExecute?: (id: string) => Promise<void>;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  request,
  onApprove,
  onReject,
  onExecute,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const impactCfg = IMPACT_CONFIG[request.impactLevel] || IMPACT_CONFIG.medium;
  const isPending = request.status === 'pending';
  const isApproved = request.status === 'approved';
  const isExecuted = request.status === 'executed';
  const isRejected = request.status === 'rejected';

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(request.id, actionNotes);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!actionNotes.trim() && !showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    setLoading(true);
    try {
      await onReject(request.id, actionNotes);
      setShowRejectInput(false);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!onExecute) return;
    setLoading(true);
    try {
      await onExecute(request.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`p-4 rounded-xl border transition shadow-sm ${
        isPending
          ? 'bg-neutral-900/70 border-amber-500/30 hover:border-amber-500/50'
          : isApproved
          ? 'bg-neutral-900/40 border-emerald-500/30'
          : isExecuted
          ? 'bg-neutral-900/20 border-cyan-500/30'
          : 'bg-neutral-900/20 border-neutral-800 opacity-60'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${impactCfg.badge}`}
          >
            {impactCfg.label}
          </span>
          <span className="text-xs font-mono font-bold text-neutral-300 bg-neutral-800 px-2 py-0.5 rounded-md border border-neutral-700">
            {request.toolName}
          </span>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              isPending
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : isApproved
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : isExecuted
                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}
          >
            {request.status}
          </span>
        </div>

        {/* Estimated Cost Pill */}
        {request.estimatedCostCents > 0 && (
          <div className="flex items-center gap-1 font-mono text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg shrink-0">
            <DollarSign className="w-3 h-3 -mr-0.5" />
            <span>{(request.estimatedCostCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
      </div>

      {/* Title & Description */}
      <div className="space-y-1 my-2">
        <h4 className="text-xs font-bold text-neutral-100">{request.title}</h4>
        {request.description && (
          <p className="text-[11px] text-neutral-400 leading-relaxed">{request.description}</p>
        )}
      </div>

      {/* Expand Payload Diff Toggle */}
      <div className="pt-2 border-t border-neutral-800/80">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] font-medium text-neutral-400 hover:text-cyan-300 flex items-center gap-1.5 transition"
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>{expanded ? 'Hide Payload Diff' : 'Inspect Mutation Payload'}</span>
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {expanded && (
          <div className="mt-2.5 p-3 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-[11px] text-neutral-300 overflow-x-auto max-h-48 scrollbar-thin">
            <pre>{JSON.stringify(request.payload, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Rejection reason or approval notes if already reviewed */}
      {request.rejectionReason && (
        <div className="mt-2.5 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-300 flex items-center gap-2">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Rejection reason: {request.rejectionReason}</span>
        </div>
      )}
      {request.approvalNotes && (
        <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Reviewer note: {request.approvalNotes}</span>
        </div>
      )}

      {/* Reviewer Action Controls for Pending */}
      {isPending && (
        <div className="mt-3 pt-3 border-t border-neutral-800 flex flex-col gap-2">
          {showRejectInput && (
            <input
              type="text"
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="Reason for rejecting this change..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-red-500 mb-1"
            />
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
              <Clock className="w-3 h-3" />
              <span>Requested {new Date(request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleReject}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-red-500/20 text-neutral-300 hover:text-red-300 border border-neutral-700 hover:border-red-500/40 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                <span>{showRejectInput ? 'Confirm Reject' : 'Reject'}</span>
              </button>

              <button
                onClick={handleApprove}
                disabled={loading}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
                <span>Approve Action</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Execute Button for Approved */}
      {isApproved && onExecute && (
        <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved & ready for connector execution</span>
          </div>
          <button
            onClick={handleExecute}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-neutral-950 transition flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Execute Live Push</span>
          </button>
        </div>
      )}
    </div>
  );
};
