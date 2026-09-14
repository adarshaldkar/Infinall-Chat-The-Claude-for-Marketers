// ============================================================
// /api/tools — Tool Catalog Listing Endpoint
// Lists all available marketing tools with metadata and safety levels
// ============================================================

import { NextResponse } from 'next/server';
import { MARKETING_TOOL_CATALOG } from '@/lib/tools/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const tools = Object.values(MARKETING_TOOL_CATALOG).map((t) => ({
    name: t.name,
    displayName: t.displayName,
    category: t.category,
    description: t.description,
    source: t.source,
    safety: t.safety,
  }));

  return NextResponse.json({
    count: tools.length,
    tools,
  });
}
