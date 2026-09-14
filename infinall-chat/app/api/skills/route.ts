// ============================================================
// Infinall Chat - Skills Directory API Router
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { SkillResolver } from '@/lib/skills/resolver';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || searchParams.get('query') || undefined;
    const category = searchParams.get('category') || undefined;

    const manifests = SkillResolver.searchManifests(query, category);

    return NextResponse.json({
      skills: manifests,
      total: manifests.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch skills' },
      { status: 500 }
    );
  }
}
