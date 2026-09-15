// ============================================================
// /api/approvals/[id] — Approve, Reject, or Execute Approval Request
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { extractSessionFromRequest } from '@/lib/security/auth';
import { ApprovalRequest } from '@/lib/security/approval-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await extractSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Approval request not found' }, { status: 404 });
    }

    const row = data as any;
    const request: ApprovalRequest = {
      id: row.id,
      projectId: row.project_id || undefined,
      campaignId: row.campaign_id || undefined,
      requesterId: row.requester_id || undefined,
      reviewerId: row.reviewer_id || undefined,
      actionType: row.action_type,
      toolName: row.tool_name,
      title: row.title,
      description: row.description || undefined,
      payload: (row.payload as Record<string, unknown>) || {},
      impactLevel: row.impact_level || 'medium',
      estimatedCostCents: Number(row.estimated_cost_cents || 0),
      status: row.status || 'pending',
      rejectionReason: row.rejection_reason || undefined,
      approvalNotes: row.approval_notes || undefined,
      hmacSignature: row.hmac_signature || undefined,
      executedAt: row.executed_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json({ request });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await extractSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { action, rejectionReason, approvalNotes } = body; // action: 'approve' | 'reject' | 'execute' | 'cancel'

    const now = new Date().toISOString();
    let newStatus: string = 'pending';
    const updates: Record<string, any> = {
      reviewer_id: session.userId,
      updated_at: now,
    };

    if (action === 'approve') {
      newStatus = 'approved';
      updates.status = 'approved';
      if (approvalNotes) updates.approval_notes = approvalNotes;
    } else if (action === 'reject') {
      newStatus = 'rejected';
      updates.status = 'rejected';
      if (rejectionReason) updates.rejection_reason = rejectionReason;
    } else if (action === 'execute') {
      newStatus = 'executed';
      updates.status = 'executed';
      updates.executed_at = now;
    } else if (action === 'cancel') {
      newStatus = 'cancelled';
      updates.status = 'cancelled';
    } else {
      return NextResponse.json({ error: 'Invalid approval action' }, { status: 400 });
    }

    const { data, error } = await (supabase as any)
      .from('approval_requests')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Append to immutable approval_audit_log for enterprise compliance
    try {
      await supabase.from('approval_audit_log').insert({
        action: action,
        tool_name: data.tool_name,
        args: data.payload,
        hmac_hash: data.hmac_signature || 'none',
        user_id: session.userId,
        status: newStatus,
      });
    } catch (_) {}

    const row = data as any;
    const request: ApprovalRequest = {
      id: row.id,
      projectId: row.project_id || undefined,
      campaignId: row.campaign_id || undefined,
      requesterId: row.requester_id || undefined,
      reviewerId: row.reviewer_id || undefined,
      actionType: row.action_type,
      toolName: row.tool_name,
      title: row.title,
      description: row.description || undefined,
      payload: (row.payload as Record<string, unknown>) || {},
      impactLevel: row.impact_level || 'medium',
      estimatedCostCents: Number(row.estimated_cost_cents || 0),
      status: row.status || 'pending',
      rejectionReason: row.rejection_reason || undefined,
      approvalNotes: row.approval_notes || undefined,
      hmacSignature: row.hmac_signature || undefined,
      executedAt: row.executed_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json({ request });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
