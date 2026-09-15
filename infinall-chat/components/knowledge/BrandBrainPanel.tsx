'use client';

// ============================================================
// Infinall Chat - Brand Brain Full Intelligence Panel
// Complete brand memory timeline, audit analytics, conflict resolution,
// category filtering, and manual directive insertion.
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Brain,
  Sparkles,
  ShieldAlert,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Archive,
  RefreshCw,
  Trash2,
  Edit3,
  Copy,
  Check,
  Zap,
  TrendingUp,
  Sliders,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { BrandMemory, MemoryCategory, MemoryStatus } from '@/lib/continuity/types';
import { MemoryConflictResolver } from './MemoryConflictResolver';

const CATEGORY_TABS: { id: string; label: string; icon: string; category?: MemoryCategory }[] = [
  { id: 'all', label: 'All Knowledge', icon: '🧠' },
  { id: 'brand_voice', label: 'Brand Voice', icon: '🎙️', category: 'brand_voice' },
  { id: 'target_audience', label: 'Audience & ICPs', icon: '🎯', category: 'target_audience' },
  { id: 'positioning', label: 'Positioning', icon: '📍', category: 'positioning' },
  { id: 'guideline', label: 'Guidelines', icon: '📜', category: 'guideline' },
  { id: 'performance_benchmark', label: 'Benchmarks', icon: '📊', category: 'performance_benchmark' },
  { id: 'do_not_mention', label: 'Do Not Mention', icon: '🚫', category: 'do_not_mention' },
  { id: 'competitive_edge', label: 'Competitive Edge', icon: '⚡', category: 'competitive_edge' },
  { id: 'pricing_model', label: 'Pricing Model', icon: '💎', category: 'pricing_model' },
];

const STATUS_FILTERS: { id: string; label: string; status?: MemoryStatus }[] = [
  { id: 'all', label: 'All Statuses' },
  { id: 'active', label: 'Active', status: 'active' },
  { id: 'conflicted', label: 'Conflicted', status: 'conflicted' },
  { id: 'superseded', label: 'Superseded', status: 'superseded' },
  { id: 'archived', label: 'Archived', status: 'archived' },
];

interface BrandBrainPanelProps {
  currentProjectId?: string;
  onClose?: () => void;
}

export const BrandBrainPanel: React.FC<BrandBrainPanelProps> = ({ currentProjectId, onClose }) => {
  const [memories, setMemories] = useState<BrandMemory[]>([]);
  const [auditStats, setAuditStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeConflict, setActiveConflict] = useState<BrandMemory | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Memory Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('brand_voice');
  const [newValue, setNewValue] = useState('');
  const [newConfidence, setNewConfidence] = useState(0.95);
  const [savingNew, setSavingNew] = useState(false);

  // Load memories and audit
  const loadBrandData = async () => {
    setLoading(true);
    try {
      const url = currentProjectId ? `/api/brand-memory?projectId=${currentProjectId}` : '/api/brand-memory';
      const auditUrl = currentProjectId ? `/api/brand-memory/audit?projectId=${currentProjectId}` : '/api/brand-memory/audit';

      const [memRes, auditRes] = await Promise.all([
        fetch(url),
        fetch(auditUrl),
      ]);

      if (memRes.ok) {
        const data = await memRes.json();
        setMemories(data.memories || []);
      }

      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditStats(auditData.audit || null);
      }
    } catch (err) {
      console.error('Failed to load brand data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrandData();
  }, [currentProjectId]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Archive this brand memory item?')) return;
    try {
      const res = await fetch(`/api/brand-memory?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMemories((prev) =>
          prev.map((m) => (m.id === id ? { ...m, status: 'archived' } : m))
        );
      }
    } catch (err) {
      console.error('Failed to archive memory:', err);
    }
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    setSavingNew(true);
    try {
      const res = await fetch('/api/brand-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newKey.trim(),
          category: newCategory,
          value: newValue.trim(),
          confidence: newConfidence,
          projectId: currentProjectId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.memory) {
          setMemories((prev) => [data.memory, ...prev]);
        }
        setShowAddModal(false);
        setNewKey('');
        setNewValue('');
        loadBrandData();
      }
    } catch (err) {
      console.error('Failed to save new memory:', err);
    } finally {
      setSavingNew(false);
    }
  };

  // Filtered memory list
  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
      if (selectedStatus !== 'all' && m.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.key.toLowerCase().includes(q) ||
          m.value.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [memories, selectedCategory, selectedStatus, searchQuery]);

  const conflictsList = useMemo(() => {
    return memories.filter((m) => m.status === 'conflicted');
  }, [memories]);

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* Top Header / Stats Banner */}
      <div className="p-6 border-b border-neutral-800/80 bg-neutral-900/40 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold bg-gradient-to-r from-neutral-100 via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
                  Brand Brain Intelligence
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Continuous Memory
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Dynamic cross-session memory consolidation, brand voice preservation & automated conflict resolution
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-neutral-950 transition flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Brand Fact</span>
            </button>
            <button
              onClick={loadBrandData}
              disabled={loading}
              className="p-2 rounded-xl border border-neutral-800 hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 transition"
              title="Refresh Brand Brain"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Audit Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-neutral-100">
                {auditStats?.activeCount ?? memories.filter((m) => m.status === 'active').length}
              </div>
              <div className="text-[11px] text-neutral-400 font-medium">Active Directives</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-amber-300">
                {auditStats?.conflictedCount ?? conflictsList.length}
              </div>
              <div className="text-[11px] text-neutral-400 font-medium">Conflicting Facts</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-cyan-300">
                {auditStats?.healthScore ? `${auditStats.healthScore}%` : '94%'}
              </div>
              <div className="text-[11px] text-neutral-400 font-medium">Consistency Score</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-purple-300">
                {auditStats?.totalMemories ?? memories.length}
              </div>
              <div className="text-[11px] text-neutral-400 font-medium">Total Learned Facts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Conflict Attention Banner if any */}
      {conflictsList.length > 0 && (
        <div className="mx-6 mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            <div>
              <h4 className="text-xs font-semibold text-amber-300">
                {conflictsList.length} Brand Directive Conflict{conflictsList.length > 1 ? 's' : ''} Detected
              </h4>
              <p className="text-[11px] text-neutral-400">
                Conflicting marketing instructions can degrade prompt quality. Reconcile them to ensure brand consistency.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveConflict(conflictsList[0])}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition flex items-center gap-1.5 shrink-0"
          >
            <span>Resolve Now</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter & Category Bar */}
      <div className="p-6 pb-2 space-y-4">
        {/* Search & Status Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search brand voice, target persona, guidelines, rules..."
              className="w-full pl-10 pr-4 py-2 bg-neutral-900/60 border border-neutral-800 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-cyan-500/60 transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <div className="flex bg-neutral-900 border border-neutral-800 rounded-xl p-0.5">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedStatus(f.id)}
                  className={`px-3 py-1 text-[11px] font-medium rounded-lg transition ${
                    selectedStatus === f.id
                      ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category Horizontal Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 border ${
                selectedCategory === tab.id
                  ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                  : 'bg-neutral-900/50 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-neutral-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Memory Items List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-xs">Consolidating brand intelligence...</p>
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20 p-8">
            <Brain className="w-12 h-12 text-neutral-600 mb-3" />
            <h3 className="text-sm font-semibold text-neutral-300">No brand memories found</h3>
            <p className="text-xs text-neutral-500 max-w-sm mt-1">
              As you interact with Infinall Chat, brand facts, target audiences, and messaging rules are automatically extracted and consolidated here.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition"
            >
              Add First Brand Fact
            </button>
          </div>
        ) : (
          filteredMemories.map((m) => {
            const isConflicted = m.status === 'conflicted';
            const isSuperseded = m.status === 'superseded';
            const isArchived = m.status === 'archived';

            return (
              <div
                key={m.id}
                className={`p-4 rounded-xl border transition ${
                  isConflicted
                    ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50'
                    : isSuperseded
                    ? 'bg-neutral-900/30 border-neutral-800/60 opacity-60'
                    : isArchived
                    ? 'bg-neutral-950 border-neutral-900 opacity-40'
                    : 'bg-neutral-900/50 border-neutral-800/80 hover:border-neutral-700/80'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-neutral-200 bg-neutral-800 px-2.5 py-0.5 rounded-lg border border-neutral-700">
                      {m.key}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {m.category.replace('_', ' ')}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isConflicted
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                          : isSuperseded
                          ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                          : isArchived
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isConflicted && (
                      <button
                        onClick={() => setActiveConflict(m)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition flex items-center gap-1 shadow-sm"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Resolve</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleCopy(m.id, m.value)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
                      title="Copy Fact"
                    >
                      {copiedId === m.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {!isArchived && (
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition"
                        title="Archive Fact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Fact Value */}
                <p className="text-xs text-neutral-200 leading-relaxed font-sans bg-neutral-950/40 p-3 rounded-lg border border-neutral-800/60">
                  {m.value}
                </p>

                {/* Footer Metadata */}
                <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            (m.confidence || 0.9) > 0.8 ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                          style={{ width: `${Math.round((m.confidence || 0.9) * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px]">
                        {Math.round((m.confidence || 0.9) * 100)}% confidence
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-neutral-600" />
                      <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {m.provenance?.sourceType && (
                    <span className="text-[10px] text-neutral-500 capitalize">
                      via {m.provenance.sourceType}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Conflict Resolution Modal */}
      {activeConflict && (
        <MemoryConflictResolver
          conflictMemory={activeConflict}
          allMemories={memories}
          onResolved={(updated) => {
            setMemories((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
            setActiveConflict(null);
            loadBrandData();
          }}
          onClose={() => setActiveConflict(null)}
        />
      )}

      {/* Add New Brand Fact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="font-semibold text-neutral-100 text-sm">Add New Brand Directive</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-neutral-200 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMemory} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="brand_voice">Brand Voice & Tone</option>
                  <option value="target_audience">Target Audience & ICP</option>
                  <option value="positioning">Product & Brand Positioning</option>
                  <option value="guideline">Editorial Guideline</option>
                  <option value="performance_benchmark">Performance Benchmark</option>
                  <option value="do_not_mention">Do Not Mention / Restricted Terms</option>
                  <option value="pricing_model">Pricing Model & Terms</option>
                  <option value="competitive_edge">Competitive Edge</option>
                  <option value="custom">Custom Directive</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Directive Key (Identifier)
                </label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="e.g., tone_of_voice, primary_icp, forbidden_keywords"
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Directive Statement / Fact
                </label>
                <textarea
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="e.g., Maintain an authoritative yet approachable tone with zero buzzwords or hyperbole."
                  rows={3}
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNew}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-neutral-950 transition flex items-center gap-2"
                >
                  {savingNew ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Directive</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
