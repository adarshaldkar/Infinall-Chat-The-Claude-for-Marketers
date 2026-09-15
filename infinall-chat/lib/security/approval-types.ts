// ============================================================
// Infinall Chat - Approval Center Governance Types
// ============================================================

export type ApprovalImpactLevel = 'low' | 'medium' | 'high' | 'critical';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'cancelled';

export interface ApprovalRequest {
  id: string;
  projectId?: string;
  campaignId?: string;
  requesterId?: string;
  reviewerId?: string;
  actionType: string;
  toolName: string;
  title: string;
  description?: string;
  payload: Record<string, unknown>;
  impactLevel: ApprovalImpactLevel;
  estimatedCostCents: number;
  status: ApprovalStatus;
  rejectionReason?: string;
  approvalNotes?: string;
  hmacSignature?: string;
  executedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const IMPACT_CONFIG: Record<
  ApprovalImpactLevel,
  { label: string; badge: string; border: string; iconColor: string }
> = {
  low: {
    label: 'Low Impact',
    badge: 'bg-neutral-800 text-neutral-300 border-neutral-700',
    border: 'border-neutral-800',
    iconColor: 'text-neutral-400',
  },
  medium: {
    label: 'Medium Impact',
    badge: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    border: 'border-blue-500/30',
    iconColor: 'text-blue-400',
  },
  high: {
    label: 'High Impact',
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    border: 'border-amber-500/30',
    iconColor: 'text-amber-400',
  },
  critical: {
    label: 'Critical / Budget Mutation',
    badge: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    border: 'border-rose-500/30',
    iconColor: 'text-rose-400',
  },
};
