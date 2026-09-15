'use client';

// ============================================================
// Infinall Chat - Brand Brain Memory Conflict Resolver
// Interactive side-by-side reconciliation for conflicting brand facts
// ============================================================

import React, { useState } from 'react';
import { AlertTriangle, Check, RefreshCw, X, ShieldAlert, ArrowRight } from 'lucide-react';
import { BrandMemory } from '@/lib/continuity/types';

interface MemoryConflictResolverProps {
  conflictMemory: BrandMemory;
  allMemories: BrandMemory[];
  onResolved: (updatedMemory: BrandMemory) => void;
  onClose: () => void;
}

export const MemoryConflictResolver: React.FC<MemoryConflictResolverProps> = ({
  conflictMemory,
  allMemories,
  onResolved,
  onClose,
}) => {
  const [resolving, setResolving] = useState(false);
  const [customValue, setCustomValue] = useState(conflictMemory.value);
  const [selectedResolution, setSelectedResolution] = useState<'keep_new' | 'keep_old' | 'custom'>('keep_new');
  const [error, setError] = useState<string | null>(null);

  // Find conflicting candidate memory if available
  const relatedMemory = allMemories.find(
    (m) =>
      m.id !== conflictMemory.id &&
      (m.key === conflictMemory.key || (conflictMemory.conflictWith && conflictMemory.conflictWith.includes(m.id)))
  );

  const handleResolve = async () => {
    setResolving(true);
    setError(null);

    try {
      let finalValue = conflictMemory.value;
      let action = 'accept_new';

      if (selectedResolution === 'keep_old') {
        action = 'archive';
      } else if (selectedResolution === 'custom') {
        finalValue = customValue;
        action = 'accept_new';
      }

      const res = await fetch('/api/brand-memory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: conflictMemory.id,
          value: finalValue,
          status: selectedResolution === 'keep_old' ? 'archived' : 'active',
          resolutionAction: action,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to resolve memory conflict');
      }

      const { memory } = await res.json();
      onResolved(memory);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-100 text-base">Brand Memory Conflict Resolution</h3>
              <p className="text-xs text-neutral-400">
                Key: <span className="text-amber-300 font-mono font-medium">{conflictMemory.key}</span> • Category: <span className="capitalize">{conflictMemory.category.replace('_', ' ')}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-xs text-neutral-300 leading-relaxed">
            Infinall detected a discrepancy between incoming brand context and your existing brand knowledge base.
            Select which directive the AI should adhere to for upcoming marketing campaigns.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option A: Current Conflict Fact */}
            <div
              onClick={() => setSelectedResolution('keep_new')}
              className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                selectedResolution === 'keep_new'
                  ? 'border-amber-500/60 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                  : 'border-neutral-800 bg-neutral-800/40 hover:border-neutral-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    Candidate Fact
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                    {Math.round((conflictMemory.confidence || 0.9) * 100)}% Conf
                  </span>
                </div>
                <p className="text-xs text-neutral-200 leading-relaxed font-mono bg-neutral-950/60 p-3 rounded-lg border border-neutral-800">
                  {conflictMemory.value}
                </p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-neutral-400">
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    selectedResolution === 'keep_new'
                      ? 'border-amber-500 bg-amber-500 text-black'
                      : 'border-neutral-600'
                  }`}
                >
                  {selectedResolution === 'keep_new' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span>Adopt this version</span>
              </div>
            </div>

            {/* Option B: Existing Memory Fact */}
            {relatedMemory ? (
              <div
                onClick={() => setSelectedResolution('keep_old')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  selectedResolution === 'keep_old'
                    ? 'border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'border-neutral-800 bg-neutral-800/40 hover:border-neutral-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      Existing Fact
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                      {Math.round((relatedMemory.confidence || 0.9) * 100)}% Conf
                    </span>
                  </div>
                  <p className="text-xs text-neutral-200 leading-relaxed font-mono bg-neutral-950/60 p-3 rounded-lg border border-neutral-800">
                    {relatedMemory.value}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-neutral-400">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedResolution === 'keep_old'
                        ? 'border-emerald-500 bg-emerald-500 text-black'
                        : 'border-neutral-600'
                    }`}
                  >
                    {selectedResolution === 'keep_old' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span>Keep existing & reject candidate</span>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setSelectedResolution('keep_old')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  selectedResolution === 'keep_old'
                    ? 'border-red-500/60 bg-red-500/10'
                    : 'border-neutral-800 bg-neutral-800/40 hover:border-neutral-700'
                }`}
              >
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Archive Memory
                  </span>
                  <p className="text-xs text-neutral-400 mt-2">
                    Mark this memory as obsolete / archived so it is no longer injected into model prompts.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-neutral-400">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedResolution === 'keep_old' ? 'border-red-500 bg-red-500 text-white' : 'border-neutral-600'
                    }`}
                  >
                    {selectedResolution === 'keep_old' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span>Archive without adopting</span>
                </div>
              </div>
            )}
          </div>

          {/* Option C: Custom Reconciliation */}
          <div
            onClick={() => setSelectedResolution('custom')}
            className={`p-4 rounded-xl border cursor-pointer transition space-y-3 ${
              selectedResolution === 'custom'
                ? 'border-cyan-500/60 bg-cyan-500/10'
                : 'border-neutral-800 bg-neutral-800/40 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                Custom Synthesized Fact
              </span>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  selectedResolution === 'custom' ? 'border-cyan-500 bg-cyan-500 text-black' : 'border-neutral-600'
                }`}
              >
                {selectedResolution === 'custom' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>
            <textarea
              value={customValue}
              onChange={(e) => {
                setCustomValue(e.target.value);
                setSelectedResolution('custom');
              }}
              rows={2}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs text-neutral-100 font-mono focus:border-cyan-500 focus:outline-none transition resize-none"
              placeholder="Enter merged brand guideline..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 flex items-center justify-end gap-3 bg-neutral-900/80">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-semibold transition flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {resolving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Reconciling...</span>
              </>
            ) : (
              <>
                <span>Commit Resolution</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
