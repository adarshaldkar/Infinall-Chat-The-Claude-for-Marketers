// ============================================================
// Infinall Chat - Skills Directory API Router
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { SkillResolver } from '@/lib/skills/resolver';

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      slug,
      category = 'custom',
      description,
      triggerKeywords = [],
      systemPromptInjection,
      rules = [],
      suggestedTools = [],
      defaultArtifactType = 'markdown',
      scope = 'personal',
      icon = 'Sparkles',
    } = body;

    if (!name || !description || !systemPromptInjection) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, and systemPromptInjection are required.' },
        { status: 400 }
      );
    }

    const formattedSlug = slug
      ? `/${slug.replace(/^\//, '').toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`
      : `/${name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`;

    const newSkill = {
      slug: formattedSlug,
      name,
      category,
      description,
      triggerKeywords: Array.isArray(triggerKeywords)
        ? triggerKeywords
        : typeof triggerKeywords === 'string'
        ? triggerKeywords.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [name.toLowerCase()],
      icon,
      estimatedTokens: Math.ceil(systemPromptInjection.length / 4) + 150,
      systemPromptInjection,
      rules,
      suggestedTools,
      defaultArtifactType,
      scope,
    };

    SkillResolver.registerCustomSkill(newSkill);

    return NextResponse.json(
      {
        message: 'Skill registered successfully',
        skill: newSkill,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create custom skill' },
      { status: 500 }
    );
  }
}
