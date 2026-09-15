// ============================================================
// /api/campaigns — List & Create Campaigns in Pipeline
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { extractSessionFromRequest } from '@/lib/security/auth';
import { Campaign, CampaignStatus } from '@/lib/campaigns/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await extractSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const status = searchParams.get('status') as CampaignStatus | null;

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ campaigns: [] });
  }

  try {
    let query = (supabase as any)
      .from('campaigns')
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
      console.warn('[API /campaigns GET] DB error:', error.message);
      return NextResponse.json({ campaigns: [] });
    }

    const campaigns: Campaign[] = ((data || []) as any[]).map((row) => ({
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      status: row.status as CampaignStatus,
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
    }));

    return NextResponse.json({ campaigns, total: campaigns.length });
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
      name,
      description = '',
      status = 'planning',
      channels = ['meta_ads'],
      budgetCents = 0,
      currency = 'USD',
      startDate,
      endDate,
      targetKpis = {},
      deliverables = [],
      projectId,
      metadata = {},
    } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Campaign name is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    const { data, error } = await (supabase as any)
      .from('campaigns')
      .insert({
        user_id: session.userId,
        project_id: projectId || null,
        name: name.trim(),
        description: description.trim(),
        status,
        channels,
        budget_cents: budgetCents,
        currency,
        start_date: startDate || null,
        end_date: endDate || null,
        target_kpis: targetKpis,
        deliverables,
        metadata,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
