// ============================================================
// /api/campaigns/[id] — Retrieve, Update, and Delete Campaign
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { extractSessionFromRequest } from '@/lib/security/auth';
import { Campaign } from '@/lib/campaigns/types';

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
    const { data, error } = await (supabase as any)
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const row = data as any;
    const campaign: Campaign = {
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      status: row.status,
      channels: row.channels || [],
      budgetCents: Number(row.budget_cents || 0),
      currency: row.currency || 'USD',
      startDate: row.start_date,
      endDate: row.end_date,
      targetKpis: row.target_kpis || {},
      actualMetrics: row.actual_metrics || {},
      deliverables: row.deliverables || [],
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json({ campaign });
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
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.status !== undefined) updates.status = body.status;
    if (body.channels !== undefined) updates.channels = body.channels;
    if (body.budgetCents !== undefined) updates.budget_cents = body.budgetCents;
    if (body.currency !== undefined) updates.currency = body.currency;
    if (body.startDate !== undefined) updates.start_date = body.startDate;
    if (body.endDate !== undefined) updates.end_date = body.endDate;
    if (body.targetKpis !== undefined) updates.target_kpis = body.targetKpis;
    if (body.actualMetrics !== undefined) updates.actual_metrics = body.actualMetrics;
    if (body.deliverables !== undefined) updates.deliverables = body.deliverables;
    if (body.metadata !== undefined) updates.metadata = body.metadata;

    const { data, error } = await (supabase as any)
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const updatedRow = data as any;
    const campaign: Campaign = {
      id: updatedRow.id,
      projectId: updatedRow.project_id,
      userId: updatedRow.user_id,
      name: updatedRow.name,
      description: updatedRow.description,
      status: updatedRow.status,
      channels: updatedRow.channels || [],
      budgetCents: Number(updatedRow.budget_cents || 0),
      currency: updatedRow.currency || 'USD',
      startDate: updatedRow.start_date,
      endDate: updatedRow.end_date,
      targetKpis: updatedRow.target_kpis || {},
      actualMetrics: updatedRow.actual_metrics || {},
      deliverables: updatedRow.deliverables || [],
      metadata: updatedRow.metadata || {},
      createdAt: updatedRow.created_at,
      updatedAt: updatedRow.updated_at,
    };

    return NextResponse.json({ campaign });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
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
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
