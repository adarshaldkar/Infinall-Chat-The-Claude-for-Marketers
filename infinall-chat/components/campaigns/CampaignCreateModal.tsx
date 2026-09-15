'use client';

// ============================================================
// Infinall Chat - Campaign Create Modal
// Allows creating a new marketing campaign with channels, budget & KPIs
// ============================================================

import React, { useState } from 'react';
import { Sparkles, X, DollarSign, Target, Megaphone, Calendar, Layers, RefreshCw } from 'lucide-react';
import { Campaign, MarketingChannel } from '@/lib/campaigns/types';

interface CampaignCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (campaign: Campaign) => void;
  currentProjectId?: string;
  initialData?: Partial<Campaign>;
}

const AVAILABLE_CHANNELS: { id: MarketingChannel; label: string }[] = [
  { id: 'meta_ads', label: 'Meta Ads (FB/IG)' },
  { id: 'google_ads', label: 'Google Search & PMax' },
  { id: 'linkedin', label: 'LinkedIn B2B' },
  { id: 'email', label: 'Email Newsletter / Sequence' },
  { id: 'seo', label: 'SEO & Content Hub' },
  { id: 'tiktok', label: 'TikTok Ads' },
];

export const CampaignCreateModal: React.FC<CampaignCreateModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  currentProjectId,
  initialData,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [selectedChannels, setSelectedChannels] = useState<MarketingChannel[]>(
    initialData?.channels || ['meta_ads']
  );
  const [budgetDollars, setBudgetDollars] = useState(
    initialData?.budgetCents ? (initialData.budgetCents / 100).toString() : '5000'
  );
  const [targetRoas, setTargetRoas] = useState(initialData?.targetKpis?.roas?.toString() || '3.5');
  const [targetLeads, setTargetLeads] = useState(initialData?.targetKpis?.leads?.toString() || '250');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleChannel = (ch: MarketingChannel) => {
    setSelectedChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          status: 'planning',
          channels: selectedChannels,
          budgetCents: Math.round(parseFloat(budgetDollars || '0') * 100),
          currency: 'USD',
          targetKpis: {
            roas: parseFloat(targetRoas || '0') || undefined,
            leads: parseInt(targetLeads || '0', 10) || undefined,
          },
          projectId: currentProjectId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create campaign');
      }

      const { campaign } = await res.json();
      onCreated(campaign);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-100 text-sm">New Marketing Campaign</h3>
              <p className="text-xs text-neutral-400">Initialize a campaign in the pipeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
              Campaign Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Q4 Enterprise CMO Acquisition — PMax & Meta"
              required
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
              Strategic Objective & Narrative
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline the core value prop, target segments, key messaging angle, and offer..."
              rows={3}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-100 focus:outline-none focus:border-cyan-500 transition resize-none"
            />
          </div>

          {/* Marketing Channels */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Distribution Channels
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_CHANNELS.map((ch) => {
                const active = selectedChannels.includes(ch.id);
                return (
                  <button
                    type="button"
                    key={ch.id}
                    onClick={() => toggleChannel(ch.id)}
                    className={`p-2.5 rounded-xl border text-xs text-left font-medium transition flex items-center justify-between ${
                      active
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <span>{ch.label}</span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        active ? 'border-cyan-500 bg-cyan-500 text-black' : 'border-neutral-700'
                      }`}
                    >
                      {active && '✓'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Budget and Targets Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                Budget (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs">$</span>
                <input
                  type="number"
                  value={budgetDollars}
                  onChange={(e) => setBudgetDollars(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                Target ROAS
              </label>
              <input
                type="number"
                step="0.1"
                value={targetRoas}
                onChange={(e) => setTargetRoas(e.target.value)}
                placeholder="3.5"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                Target Leads / Conv
              </label>
              <input
                type="number"
                value={targetLeads}
                onChange={(e) => setTargetLeads(e.target.value)}
                placeholder="250"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-neutral-950 transition flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Campaign...</span>
                </>
              ) : (
                <span>Launch in Pipeline</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
