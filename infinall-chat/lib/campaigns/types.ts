// ============================================================
// Infinall Chat - Campaign Pipeline Types & Constants
// ============================================================

export type CampaignStatus =
  | 'planning'
  | 'in_review'
  | 'approved'
  | 'running'
  | 'completed'
  | 'paused'
  | 'cancelled';

export type MarketingChannel =
  | 'meta_ads'
  | 'google_ads'
  | 'linkedin'
  | 'email'
  | 'seo'
  | 'content'
  | 'tiktok'
  | 'twitter'
  | 'influencer';

export interface CampaignDeliverable {
  id: string;
  title: string;
  type: 'copy' | 'image' | 'video' | 'audience' | 'landing_page' | 'report';
  status: 'draft' | 'pending_review' | 'approved' | 'published';
  assetUrl?: string;
  content?: string;
}

export interface TargetKPIs {
  roas?: number;
  cpaCents?: number;
  leads?: number;
  conversions?: number;
  clicks?: number;
  impressions?: number;
  revenueCents?: number;
}

export interface ActualMetrics {
  spendCents?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  roas?: number;
  cpaCents?: number;
}

export interface Campaign {
  id: string;
  projectId?: string;
  userId?: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  channels: MarketingChannel[];
  budgetCents: number;
  currency: string;
  startDate?: string;
  endDate?: string;
  targetKpis: TargetKPIs;
  actualMetrics: ActualMetrics;
  deliverables: CampaignDeliverable[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export const CAMPAIGN_STATUS_CONFIG: Record<
  CampaignStatus,
  { label: string; color: string; bgColor: string; borderColor: string; description: string }
> = {
  planning: {
    label: 'Planning',
    color: 'text-neutral-300',
    bgColor: 'bg-neutral-800/80',
    borderColor: 'border-neutral-700',
    description: 'Strategy drafting, copy ideation, audience research',
  },
  in_review: {
    label: 'In Review',
    color: 'text-amber-300',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    description: 'Awaiting CMO/Client approval in Approval Center',
  },
  approved: {
    label: 'Approved',
    color: 'text-emerald-300',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    description: 'Ready for live connector sync & ad account push',
  },
  running: {
    label: 'Running',
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    description: 'Active on ad platforms, spending budget, tracking metrics',
  },
  paused: {
    label: 'Paused',
    color: 'text-orange-300',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    description: 'Temporarily halted on platforms',
  },
  completed: {
    label: 'Completed',
    color: 'text-blue-300',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    description: 'Campaign period finished, final analytics computed',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    description: 'Aborted prior to or during launch',
  },
};
