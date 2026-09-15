'use client';

// ============================================================
// Infinall Chat - Campaign Card Component
// Displays campaign status, channels, KPI targets, budget, and quick actions
// ============================================================

import React from 'react';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  Layers,
  MoreVertical,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Campaign, CAMPAIGN_STATUS_CONFIG, CampaignStatus } from '@/lib/campaigns/types';

interface CampaignCardProps {
  campaign: Campaign;
  onStatusChange: (campaignId: string, newStatus: CampaignStatus) => void;
  onSelect?: (campaign: Campaign) => void;
}

const CHANNEL_ICONS: Record<string, { label: string; color: string }> = {
  meta_ads: { label: 'Meta', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  google_ads: { label: 'Google', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  linkedin: { label: 'LinkedIn', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  email: { label: 'Email', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  seo: { label: 'SEO', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  content: { label: 'Content', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  tiktok: { label: 'TikTok', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
};

export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  onStatusChange,
  onSelect,
}) => {
  const statusCfg = CAMPAIGN_STATUS_CONFIG[campaign.status] || CAMPAIGN_STATUS_CONFIG.planning;
  const budgetFormatted = (campaign.budgetCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: campaign.currency || 'USD',
    maximumFractionDigits: 0,
  });

  const nextStatusMap: Partial<Record<CampaignStatus, CampaignStatus>> = {
    planning: 'in_review',
    in_review: 'approved',
    approved: 'running',
    running: 'completed',
    paused: 'running',
  };

  const nextStatus = nextStatusMap[campaign.status];

  return (
    <div
      onClick={() => onSelect?.(campaign)}
      className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-900 hover:border-neutral-700 transition shadow-sm hover:shadow-lg space-y-3 cursor-pointer group"
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-xs font-bold text-neutral-100 group-hover:text-cyan-300 transition line-clamp-1">
          {campaign.name}
        </h4>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusCfg.bgColor} ${statusCfg.color} ${statusCfg.borderColor} uppercase tracking-wider shrink-0`}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* Description */}
      {campaign.description && (
        <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
          {campaign.description}
        </p>
      )}

      {/* Channels Badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(campaign.channels || []).map((ch) => {
          const cfg = CHANNEL_ICONS[ch] || { label: ch, color: 'bg-neutral-800 text-neutral-300 border-neutral-700' };
          return (
            <span
              key={ch}
              className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${cfg.color}`}
            >
              {cfg.label}
            </span>
          );
        })}
      </div>

      {/* KPIs and Budget Row */}
      <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
        <div className="flex items-center gap-1 font-mono font-medium text-neutral-200">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400 -mr-0.5" />
          <span>{budgetFormatted}</span>
        </div>

        {campaign.targetKpis?.roas && (
          <div className="flex items-center gap-1 text-cyan-300 font-medium">
            <TrendingUp className="w-3 h-3 text-cyan-400" />
            <span>{campaign.targetKpis.roas}x ROAS</span>
          </div>
        )}

        {campaign.deliverables && campaign.deliverables.length > 0 && (
          <div className="flex items-center gap-1 text-neutral-500">
            <Layers className="w-3 h-3" />
            <span>{campaign.deliverables.length} assets</span>
          </div>
        )}
      </div>

      {/* Action button */}
      {nextStatus && (
        <div className="pt-1 flex items-center justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(campaign.id, nextStatus);
            }}
            className="text-[11px] font-medium text-neutral-400 hover:text-cyan-300 flex items-center gap-1 transition opacity-0 group-hover:opacity-100"
          >
            <span>Move to {CAMPAIGN_STATUS_CONFIG[nextStatus].label}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
