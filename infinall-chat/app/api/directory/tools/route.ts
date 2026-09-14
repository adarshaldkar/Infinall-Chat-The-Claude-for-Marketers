// ============================================================
// Infinall Chat - 100+ Tools Directory API Router
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { DIRECTORY_TOOLS, ToolCategory, ToolDirectoryItem } from '@/lib/tools/directory-catalog';
import { getConnectorAvailability } from '@/lib/mcp/config';

export const runtime = 'nodejs';

type DirectoryStatus = ToolDirectoryItem['status'];

/**
 * Derive effective status for a tool instead of trusting hardcoded labels:
 *  - tools wired to a real connector (envKey) reflect live/sandbox/off;
 *  - un-wired tools are honestly listed as requires_auth (external auth needed),
 *    never advertised as "active".
 */
function effectiveStatus(tool: ToolDirectoryItem): DirectoryStatus {
  if (!tool.envKey) return 'requires_auth';
  const availability = getConnectorAvailability(tool.envKey);
  if (availability === 'live') return 'active';
  if (availability === 'sandbox') return 'mock';
  return 'requires_auth';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = (searchParams.get('category') || 'all') as ToolCategory;
    const query = searchParams.get('q') || searchParams.get('query') || '';

    let tools: ToolDirectoryItem[] = DIRECTORY_TOOLS.map((tool) => ({
      ...tool,
      status: effectiveStatus(tool),
    }));

    if (category !== 'all') {
      tools = tools.filter((t) => t.category === category);
    }

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      tools = tools.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({
      tools,
      total: tools.length,
      categories: [
        { id: 'all', label: 'All Tools' },
        { id: 'paid_media', label: 'Paid Acquisition' },
        { id: 'analytics', label: 'Analytics & Attribution' },
        { id: 'seo_scraping', label: 'SEO & Scraping' },
        { id: 'crm_retention', label: 'CRM & Retention' },
        { id: 'automation', label: 'Automation & Alerts' },
      ],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch directory tools' },
      { status: 500 }
    );
  }
}
