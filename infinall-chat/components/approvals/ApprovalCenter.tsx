'use client';

// ============================================================
// Infinall Chat - Approval Center Governance Dashboard
// Central approval inbox with tamper-evident HMAC signing, diff viewer & RBAC
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  RefreshCw,
  X,
  FileCheck,
  AlertTriangle,
  History,
  Lock
} from 'lucide-react';
import { ApprovalRequest, ApprovalStatus } from '@/lib/security/approval-types';
import { ApprovalCard } from './ApprovalCard';

interface ApprovalCenterProps {
  currentProjectId?: string;
  onClose?: () => void;
}

export const ApprovalCenter: React.FC<ApprovalCenterProps> = ({
  currentProjectId,
  onClose,
}) => {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const url = currentProjectId
        ? `/api/approvals?projectId=${currentProjectId}`
        : '/api/approvals';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [currentProjectId]);

  const handleApprove = async (id: string, notes?: string) => {
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', approvalNotes: notes }),
      });
      if (res.ok) {
        const { request } = await res.json();
        setRequests((prev) => prev.map((r) => (r.id === id ? request : r)));
      }
    } catch (err) {
      console.error('Failed to approve request:', err);
    }
  };

  const handleReject = async (id: string, reason?: string) => {
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectionReason: reason }),
      });
      if (res.ok) {
        const { request } = await res.json();
        setRequests((prev) => prev.map((r) => (r.id === id ? request : r)));
      }
    } catch (err) {
      console.error('Failed to reject request:', err);
    }
  };

  const handleExecute = async (id: string) => {
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute' }),
      });
      if (res.ok) {
        const { request } = await res.json();
        setRequests((prev) => prev.map((r) => (r.id === id ? request : r)));
      }
    } catch (err) {
      console.error('Failed to execute request:', err);
    }
  };

  const pendingCount = useMemo(() => {
    return requests.filter((r) => r.status === 'pending').length;
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (activeTab === 'pending' && r.status !== 'pending') return false;
      if (activeTab === 'history' && r.status === 'pending') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          r.toolName.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [requests, activeTab, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* Top Banner */}
      <div className="p-6 border-b border-neutral-800 bg-neutral-900/40 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold bg-gradient-to-r from-neutral-100 via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
                  Approval Center & Governance
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Zero-Accident Safety
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Role-based approval gates for ad spend mutations, campaign publishes, and high-impact actions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchApprovals}
              disabled={loading}
              className="p-2 rounded-xl border border-neutral-800 hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 transition"
              title="Refresh Approvals"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab Controls & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="flex bg-neutral-900 border border-neutral-800 rounded-xl p-1 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === 'pending'
                  ? 'bg-amber-500 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span>Pending Review</span>
              {pendingCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === 'pending' ? 'bg-neutral-950 text-amber-400' : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-neutral-800 text-neutral-100 shadow-md'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Review History</span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'all'
                  ? 'bg-neutral-800 text-neutral-100 shadow-md'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              All Logs
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search actions..."
              className="w-full pl-8 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500 space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
            <p className="text-xs">Loading governance logs...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20 p-8">
            <ShieldCheck className="w-12 h-12 text-emerald-500 mb-3" />
            <h3 className="text-sm font-semibold text-neutral-200">
              {activeTab === 'pending' ? 'No pending approval requests' : 'No records found'}
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mt-1">
              When tool actions or campaign pushes require supervisor sign-off, they will appear here with cryptographic HMAC integrity verification.
            </p>
          </div>
        ) : (
          filteredRequests.map((req) => (
            <ApprovalCard
              key={req.id}
              request={req}
              onApprove={handleApprove}
              onReject={handleReject}
              onExecute={handleExecute}
            />
          ))
        )}
      </div>
    </div>
  );
};
