// ============================================================
// /api/approvals — List & Create Approval Requests
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { extractSessionFromRequest } from '@/lib/security/auth';
import { ApprovalRequest, ApprovalStatus } from '@/lib/security/approval-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await extractSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const status = searchParams.get('status') as ApprovalStatus | null;

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ requests: [], total: 0 });
  }

  try {
    let query = supabase
      .from('approval_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[API /approvals GET] DB error:', error.message);
      return NextResponse.json({ requests: [], total: 0 });
    }

    const requests: ApprovalRequest[] = (((data || []) as any[])).map((row) => ({
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
      impactLevel: (row.impact_level as any) || 'medium',
      estimatedCostCents: Number(row.estimated_cost_cents || 0),
      status: (row.status as any) || 'pending',
      rejectionReason: row.rejection_reason || undefined,
      approvalNotes: row.approval_notes || undefined,
      hmacSignature: row.hmac_signature || undefined,
      executedAt: row.executed_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ requests, total: requests.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await extractSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      title,
      description = '',
      actionType,
      toolName,
      payload = {},
      impactLevel = 'medium',
      estimatedCostCents = 0,
      projectId,
      campaignId,
    } = body;

    if (!title || !actionType || !toolName) {
      return NextResponse.json(
        { error: 'Missing required fields: title, actionType, toolName' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Sign payload with HMAC for tamper resistance
    const secret = process.env.APPROVAL_HMAC_SECRET || 'infinall-governance-secret';
    const hmacSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const { data, error } = await (supabase as any)
      .from('approval_requests')
      .insert({
        requester_id: session.userId,
        project_id: projectId || null,
        campaign_id: campaignId || null,
        title: title.trim(),
        description: description.trim(),
        action_type: actionType,
        tool_name: toolName,
        payload,
        impact_level: impactLevel,
        estimated_cost_cents: estimatedCostCents,
        status: 'pending',
        hmac_signature: hmacSignature,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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
      hmacSignature: row.hmac_signature || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json({ request }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
