// ============================================================
// Tool Discovery & Catalog Search Engine
// Complements the Step 3 Planner by matching semantic intent
// ============================================================

import { MARKETING_TOOL_CATALOG, ToolCatalogDescriptor } from './catalog';

export function searchToolCatalog(query: string, limit: number = 3): ToolCatalogDescriptor[] {
  const normalized = query.toLowerCase();
  const scored: Array<{ tool: ToolCatalogDescriptor; score: number }> = [];

  for (const tool of Object.values(MARKETING_TOOL_CATALOG)) {
    let score = 0;

    // Check direct name match
    if (normalized.includes(tool.name)) score += 10;
    if (normalized.includes(tool.displayName.toLowerCase())) score += 8;

    // Check keyword matches
    for (const kw of tool.keywords) {
      if (normalized.includes(kw)) {
        score += 3;
      }
    }

    if (score > 0) {
      scored.push({ tool, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.tool);
}

export function resolveCandidateTools(plannerCandidates: string[], userMessage: string): ToolCatalogDescriptor[] {
  const resolved = new Map<string, ToolCatalogDescriptor>();

  // 1. Add tools explicitly selected by Step 3 Planner
  for (const name of plannerCandidates) {
    if (MARKETING_TOOL_CATALOG[name]) {
      resolved.set(name, MARKETING_TOOL_CATALOG[name]);
    }
  }

  // 2. Discover auxiliary tools from catalog search so planner doesn't miss key tools
  const searchResults = searchToolCatalog(userMessage, 2);
  for (const tool of searchResults) {
    if (!resolved.has(tool.name)) {
      resolved.set(tool.name, tool);
    }
  }

  return Array.from(resolved.values());
}
