'use client';

// ============================================================
// Brand Memory Viewer Modal
// Displays consolidated marketing facts & preferences across sessions
// ============================================================

import React, { useState, useEffect } from 'react';
import { Brain, Sparkles, X, CheckCircle, ShieldCheck, Loader2 } from 'lucide-react';

interface MemoryItem {
  id: string;
  category: string;
  memory_key?: string;
  key?: string;
  memory_value?: string;
  value?: string;
  confidence: number;
  created_at?: string;
  createdAt?: string;
}

interface MemoryViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MemoryViewerModal({ isOpen, onClose }: MemoryViewerModalProps) {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen && !wasOpen) {
    setWasOpen(true);
    setLoading(true);
  }
  if (!isOpen && wasOpen) {
    setWasOpen(false);
  }

  useEffect(() => {
    if (isOpen) {
      fetch('/api/knowledge/memories')
        .then(res => res.json())
        .then(data => {
          setMemories(data.memories || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categoryColors: Record<string, string> = {
    brand_voice: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    target_audience: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    product_catalog: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    campaign_learning: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    competitor_positioning: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#18181b] border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-[#141416]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                Brand Memory & Continuity
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                  Autonomous Consolidation
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Marketing insights, tone guidelines, and audience rules preserved across sessions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-zinc-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              <p className="text-xs">Loading Brand Memory...</p>
            </div>
          ) : memories.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="text-sm font-medium text-zinc-400">No brand memories consolidated yet</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                As you chat, Infinall automatically extracts your target audience, brand tone, campaign rules, and competitor positioning.
              </p>
            </div>
          ) : (
            memories.map(item => {
              const cat = item.category || 'brand_voice';
              const keyName = item.memory_key || item.key || 'guideline';
              const val = item.memory_value || item.value || '';
              const badgeClass = categoryColors[cat] || 'text-zinc-300 bg-zinc-800 border-zinc-700';

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-zinc-800/80 bg-[#1c1c20] hover:border-zinc-700 transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${badgeClass}`}>
                      {cat.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      {Math.round((item.confidence || 0.9) * 100)}% confidence
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-zinc-200 capitalize">
                    {keyName.replace(/_/g, ' ')}
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/40">
                    {val}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800/80 bg-[#141416] flex items-center justify-between text-xs text-zinc-500">
          <span>Injected dynamically into context assembly on every prompt</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
