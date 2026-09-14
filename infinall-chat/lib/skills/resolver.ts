// ============================================================
// Infinall Chat - Progressive Skills Resolver
// 3-Level Progressive Disclosure Loader
// ============================================================

import { BUILTIN_SKILLS } from './catalog';
import { CompleteSkill, SkillManifest, SkillResolutionResult } from './types';

export class SkillResolver {
  private static customSkills: CompleteSkill[] = [];

  /**
   * Register a custom team / workspace skill (Level 3)
   */
  static registerCustomSkill(skill: CompleteSkill) {
    const existingIdx = this.customSkills.findIndex((s) => s.slug === skill.slug);
    if (existingIdx >= 0) {
      this.customSkills[existingIdx] = skill;
    } else {
      this.customSkills.push(skill);
    }
  }

  /**
   * Get all available skill manifests (Level 1: <50 tokens each for Planner)
   */
  static getAllManifests(): SkillManifest[] {
    const all = [...BUILTIN_SKILLS, ...this.customSkills];
    return all.map(({ slug, name, category, description, triggerKeywords, icon, estimatedTokens }) => ({
      slug,
      name,
      category,
      description,
      triggerKeywords,
      icon,
      estimatedTokens,
    }));
  }

  /**
   * Search manifests by query string or category filter
   */
  static searchManifests(query?: string, category?: string): SkillManifest[] {
    let manifests = this.getAllManifests();

    if (category && category !== 'all') {
      manifests = manifests.filter((m) => m.category === category);
    }

    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      manifests = manifests.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.slug.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.triggerKeywords.some((k) => k.toLowerCase().includes(q))
      );
    }

    return manifests;
  }

  /**
   * Resolve skill for an incoming prompt (Level 2: On-Demand Injection)
   * Priority:
   * 1. Explicit Slash Command (e.g. "/ad-copy Draft LinkedIn ads")
   * 2. Keyword Intent Auto-Match
   */
  static resolveSkill(prompt: string): SkillResolutionResult {
    const trimmed = prompt.trim();
    const allSkills = [...BUILTIN_SKILLS, ...this.customSkills];

    // 1. Check for explicit slash command at beginning
    for (const skill of allSkills) {
      if (trimmed.startsWith(skill.slug)) {
        const cleaned = trimmed.slice(skill.slug.length).trim();
        return {
          matchedSkill: skill,
          cleanedPrompt: cleaned || prompt,
          isExplicitSlashCommand: true,
        };
      }
    }

    // 2. Fuzzy Keyword Intent Matching
    const lowerPrompt = trimmed.toLowerCase();
    for (const skill of allSkills) {
      const matchCount = skill.triggerKeywords.filter((kw) => lowerPrompt.includes(kw.toLowerCase())).length;
      if (matchCount >= 2) {
        return {
          matchedSkill: skill,
          cleanedPrompt: prompt,
          isExplicitSlashCommand: false,
        };
      }
    }

    return {
      matchedSkill: null,
      cleanedPrompt: prompt,
      isExplicitSlashCommand: false,
    };
  }

  /**
   * Get complete skill definition by slug
   */
  static getSkillBySlug(slug: string): CompleteSkill | null {
    const all = [...BUILTIN_SKILLS, ...this.customSkills];
    return all.find((s) => s.slug === slug || s.slug === `/${slug.replace(/^\//, '')}`) || null;
  }
}
