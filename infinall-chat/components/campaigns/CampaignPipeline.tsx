'use client';

// ============================================================
// Infinall Chat - Campaign Pipeline Kanban Board
// Visual multi-stage campaign management, budget tracking, and channel distribution
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Plus,
  Filter,
  Search,
  RefreshCw,
  Sliders,
  DollarSign,
  TrendingUp,
  Megaphone,
  CheckCircle2,
  Calendar,
  X
} from 'lucide-react';
import { Campaign, CampaignStatus, CAMPAIGN_STATUS_CONFIG } from '@/lib/campaigns/types';
import { CampaignCard } from './CampaignCard';
import { CampaignCreateModal } from './CampaignCreateModal';

interface CampaignPipelineProps {
  currentProjectId?: string;
  onClose?: () => void;
}

const PIPELINE_STAGES: CampaignStatus[] = [
  'planning',
  'in_review',
  'approved',
  'running',
  'completed',
  'paused',
];

export const CampaignPipeline: React.FC<CampaignPipelineProps> = ({
  currentProjectId,
  onClose,
}) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const url = currentProjectId
        ? `/api/campaigns?projectId=${currentProjectId}`
        : '/api/campaigns';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [currentProjectId]);

  const handleStatusChange = async (campaignId: string, newStatus: CampaignStatus) => {
    // Optimistic UI update
    setCampaigns((prev) =>
      prev.map((c) => (c.id === campaignId ? { ...c, status: newStatus } : c))
    );

    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        fetchCampaigns();
      }
    } catch (err) {
      console.error('Failed to update campaign status:', err);
      fetchCampaigns();
    }
  };

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (selectedChannel !== 'all' && !c.channels.includes(selectedChannel as any)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [campaigns, selectedChannel, searchQuery]);

  // Total active budget computation
  const totalBudget = useMemo(() => {
    return campaigns.reduce((acc, c) => acc + (c.budgetCents || 0), 0);
  }, [campaigns]);

  const totalRunning = useMemo(() => {
    return campaigns.filter((c) => c.status === 'running').length;
  }, [campaigns]);

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* Top Banner */}
      <div className="p-6 border-b border-neutral-800 bg-neutral-900/40 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold bg-gradient-to-r from-neutral-100 via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
                  Marketing Campaign Pipeline
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Lifecycle Engine
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Manage campaigns from strategy ideation, stakeholder approval, to live ad account execution
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-neutral-950 transition flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Campaign</span>
            </button>
            <button
              onClick={fetchCampaigns}
              disabled={loading}
              className="p-2 rounded-xl border border-neutral-800 hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 transition"
              title="Refresh Pipeline"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-neutral-100">{campaigns.length}</div>
              <div className="text-[11px] text-neutral-400">Total Campaigns</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-300">
                ${(totalBudget / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[11px] text-neutral-400">Pipeline Budget</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-blue-300">{totalRunning} Active</div>
              <div className="text-[11px] text-neutral-400">Live on Ad Accounts</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-amber-300">
                {campaigns.filter((c) => c.status === 'in_review').length} Pending
              </div>
              <div className="text-[11px] text-neutral-400">In Review Stage</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-6 py-3 border-b border-neutral-800/60 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns..."
            className="w-full pl-9 pr-4 py-1.5 bg-neutral-900/60 border border-neutral-800 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-neutral-500 font-medium">Channel:</span>
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Channels</option>
            <option value="meta_ads">Meta Ads</option>
            <option value="google_ads">Google Ads</option>
            <option value="linkedin">LinkedIn</option>
            <option value="email">Email</option>
            <option value="seo">SEO</option>
            <option value="tiktok">TikTok</option>
          </select>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="flex-1 overflow-x-auto p-6 scrollbar-thin">
        <div className="flex gap-4 min-w-max h-full">
          {PIPELINE_STAGES.map((stage) => {
            const stageConfig = CAMPAIGN_STATUS_CONFIG[stage];
            const stageCampaigns = filteredCampaigns.filter((c) => c.status === stage);

            return (
              <div
                key={stage}
                className="w-72 flex flex-col bg-neutral-900/30 border border-neutral-800/80 rounded-2xl p-3 h-full overflow-hidden"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between px-2 py-1.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        stage === 'running'
                          ? 'bg-cyan-400 animate-pulse'
                          : stage === 'approved'
                          ? 'bg-emerald-400'
                          : stage === 'in_review'
                          ? 'bg-amber-400'
                          : 'bg-neutral-500'
                      }`}
                    />
                    <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                      {stageConfig.label}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-semibold">
                    {stageCampaigns.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-none">
                  {stageCampaigns.length === 0 ? (
                    <div className="h-28 border border-dashed border-neutral-800/60 rounded-xl flex items-center justify-center text-[11px] text-neutral-600">
                      No campaigns
                    </div>
                  ) : (
                    stageCampaigns.map((c) => (
                      <CampaignCard
                        key={c.id}
                        campaign={c}
                        onStatusChange={handleStatusChange}
                        onSelect={(camp) => setActiveCampaign(camp)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CampaignCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={(created) => {
            setCampaigns((prev) => [created, ...prev]);
          }}
          currentProjectId={currentProjectId}
        />
      )}
    </div>
  );
};
