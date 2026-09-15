// ============================================================
// Infinall Chat - Progressive Skills Resolver
// 3-Level Progressive Disclosure Loader with:
// - Multi-factor intent scoring (keywords + description + title similarity)
// - Confidence thresholding and conflict resolution
// - Durable filesystem workspace skills (.infinall/skills/*.md & .infinall/skills/*.json)
// ============================================================

import fs from 'fs';
import path from 'path';
import { BUILTIN_SKILLS } from './catalog';
import { CompleteSkill, SkillManifest, SkillResolutionResult } from './types';
import { db } from '@/lib/storage/db';

const WORKSPACE_SKILLS_DIR = path.resolve(process.cwd(), '.infinall', 'skills');

function ensureSkillsDir() {
  if (!fs.existsSync(WORKSPACE_SKILLS_DIR)) {
    try {
      fs.mkdirSync(WORKSPACE_SKILLS_DIR, { recursive: true });
    } catch {
      // Ignored if permissions restrict
    }
  }
}

export class SkillResolver {
  private static customSkills: CompleteSkill[] = [];
  private static filesLoaded = false;

  /**
   * Load custom skills from .infinall/skills directory on disk and db.customSkills
   */
  public static loadWorkspaceSkills(): CompleteSkill[] {
    const loadedSkills: CompleteSkill[] = [];

    // 1. Load from db.customSkills
    const dbItems = db.customSkills.getAll();
    for (const item of dbItems) {
      loadedSkills.push({
        slug: `/${item.id.replace(/^\//, '')}`,
        name: item.name,
        category: 'custom',
        description: item.description,
        triggerKeywords: item.triggers,
        icon: 'Sparkles',
        estimatedTokens: 350,
        systemPromptInjection: item.systemPromptAddition,
        rules: [],
        suggestedTools: [],
      });
    }

    // 2. Load from filesystem .infinall/skills/*.json or *.md
    try {
      ensureSkillsDir();
      if (fs.existsSync(WORKSPACE_SKILLS_DIR)) {
        const files = fs.readdirSync(WORKSPACE_SKILLS_DIR);
        for (const file of files) {
          const fullPath = path.join(WORKSPACE_SKILLS_DIR, file);
          if (file.endsWith('.json')) {
            const raw = fs.readFileSync(fullPath, 'utf-8');
            const parsed = JSON.parse(raw) as CompleteSkill;
            if (parsed.slug && parsed.name && parsed.systemPromptInjection) {
              loadedSkills.push(parsed);
            }
          } else if (file.endsWith('.md')) {
            // Parse frontmatter from markdown skill file
            const raw = fs.readFileSync(fullPath, 'utf-8');
            const slug = `/${file.replace(/\.md$/, '')}`;
            const lines = raw.split('\n');
            let name = file.replace(/\.md$/, '').replace(/-/g, ' ');
            let desc = 'Custom workspace marketing skill';
            let keywords: string[] = [];

            // Simple frontmatter parsing
            if (lines[0]?.trim() === '---') {
              const endIdx = lines.slice(1).findIndex((l) => l.trim() === '---');
              if (endIdx !== -1) {
                const fmLines = lines.slice(1, endIdx + 1);
                for (const fml of fmLines) {
                  const [k, ...v] = fml.split(':');
                  const val = v.join(':').trim();
                  if (k.trim() === 'name') name = val;
                  if (k.trim() === 'description') desc = val;
                  if (k.trim() === 'keywords') keywords = val.split(',').map((s) => s.trim());
                }
              }
            }

            loadedSkills.push({
              slug,
              name,
              category: 'custom',
              description: desc,
              triggerKeywords: keywords.length > 0 ? keywords : [name.toLowerCase()],
              icon: 'FileCode',
              estimatedTokens: 400,
              systemPromptInjection: raw,
              rules: [],
              suggestedTools: [],
            });
          }
        }
      }
    } catch (err) {
      console.warn('[SkillResolver] Failed reading workspace skills from disk:', err);
    }

    this.customSkills = loadedSkills;
    this.filesLoaded = true;
    return loadedSkills;
  }

  /**
   * Sync custom skills from Supabase custom_skills table (personal, team, catalog)
   */
  public static async syncWithSupabase(userId?: string): Promise<void> {
    try {
      const { getSupabaseServerClient } = await import('@/lib/supabase/server');
      const supabase = getSupabaseServerClient();
      if (!supabase) return;

      let query = (supabase as any).from('custom_skills').select('*');
      if (userId) {
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (UUID_REGEX.test(userId)) {
          query = query.or(`user_id.eq.${userId},scope.eq.catalog,scope.eq.team`);
        }
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        for (const rawRow of data) {
          const row = rawRow as Record<string, any>;
          const skill: CompleteSkill = {
            slug: typeof row.slug === 'string' && row.slug.startsWith('/') ? row.slug : `/${row.slug}`,
            name: String(row.name || 'Custom Skill'),
            category: row.category || 'custom',
            description: String(row.description || ''),
            triggerKeywords: Array.isArray(row.trigger_keywords) ? row.trigger_keywords : [String(row.name || '').toLowerCase()],
            icon: row.icon || 'Sparkles',
            estimatedTokens: Math.ceil((String(row.system_prompt_injection || '').length) / 4) + 150,
            systemPromptInjection: String(row.system_prompt_injection || ''),
            rules: Array.isArray(row.rules) ? row.rules : [],
            suggestedTools: Array.isArray(row.suggested_tools) ? row.suggested_tools : [],
            defaultArtifactType: row.default_artifact_type || 'markdown',
            scope: row.scope || 'personal',
          };
          const existingIdx = this.customSkills.findIndex((s) => s.slug === skill.slug);
          if (existingIdx >= 0) {
            this.customSkills[existingIdx] = skill;
          } else {
            this.customSkills.push(skill);
          }
        }
      }
    } catch (err) {
      console.warn('[SkillResolver] Supabase sync warning:', err);
    }
  }

  /**
   * Register a custom team / workspace skill (Level 3)
   */
  static registerCustomSkill(skill: CompleteSkill, userId?: string, projectId?: string) {
    const existingIdx = this.customSkills.findIndex((s) => s.slug === skill.slug);
    if (existingIdx >= 0) {
      this.customSkills[existingIdx] = skill;
    } else {
      this.customSkills.push(skill);
    }

    // Persist to db.customSkills
    db.customSkills.set(skill.slug.replace(/^\//, ''), {
      id: skill.slug.replace(/^\//, ''),
      name: skill.name,
      description: skill.description,
      triggers: skill.triggerKeywords,
      systemPromptAddition: skill.systemPromptInjection,
      createdAt: new Date().toISOString(),
    });

    // Also persist to Supabase custom_skills table if available
    if (userId) {
      import('@/lib/supabase/server').then(({ getSupabaseServerClient }) => {
        const supabase = getSupabaseServerClient();
        if (supabase) {
          const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const validUserId = UUID_REGEX.test(userId) ? userId : null;
          if (validUserId) {
            (supabase as any).from('custom_skills').upsert({
              id: skill.slug.replace(/^\//, ''),
              user_id: validUserId,
              project_id: projectId && UUID_REGEX.test(projectId) ? projectId : null,
              slug: skill.slug,
              name: skill.name,
              category: skill.category,
              description: skill.description,
              trigger_keywords: skill.triggerKeywords,
              system_prompt_injection: skill.systemPromptInjection,
              rules: skill.rules || [],
              suggested_tools: skill.suggestedTools || [],
              default_artifact_type: skill.defaultArtifactType || 'markdown',
              scope: skill.scope || 'personal',
              icon: skill.icon || 'Sparkles',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' }).then(({ error }: { error?: any }) => {
              if (error) console.warn('[SkillResolver] Supabase skill upsert warning:', error.message);
            });
          }
        }
      }).catch((err) => {
        console.warn('[SkillResolver] Supabase loader error:', err);
      });
    }
  }

  /**
   * Get all available skill manifests (Level 1: <50 tokens each for Planner)
   */
  static getAllManifests(): SkillManifest[] {
    if (!this.filesLoaded) this.loadWorkspaceSkills();
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
   * Multi-Factor Intent Matching Algorithm
   * Scores based on:
   * 1. Exact slash command match (score = 1.0)
   * 2. Keyword exact hits (weight 0.45)
   * 3. Description token overlap (weight 0.35)
   * 4. Title similarity (weight 0.20)
   * Threshold: >= 0.40
   */
  static resolveSkill(prompt: string): SkillResolutionResult {
    if (!this.filesLoaded) this.loadWorkspaceSkills();
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

    // 2. Multi-factor semantic & keyword scoring
    const promptWords = new Set(
      trimmed
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );

    let bestSkill: CompleteSkill | null = null;
    let highestScore = 0;

    for (const skill of allSkills) {
      let score = 0;

      // Keyword matching: exact phrase or token overlap
      const matchingKeywords = skill.triggerKeywords.filter((kw) => {
        const lowerKw = kw.toLowerCase();
        if (trimmed.toLowerCase().includes(lowerKw)) return true;
        const kwParts = lowerKw.split(/\s+/);
        return kwParts.some((p) => p.length > 3 && promptWords.has(p));
      });
      if (matchingKeywords.length > 0) {
        score += Math.min(0.60, matchingKeywords.length * 0.25);
      }

      // Title match
      const titleWords = skill.name.toLowerCase().split(/\s+/);
      const titleHits = titleWords.filter((w) => promptWords.has(w)).length;
      if (titleHits > 0) {
        score += Math.min(0.25, (titleHits / titleWords.length) * 0.25);
      }

      // Description token overlap (Jaccard-like)
      const descWords = skill.description.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const descHits = descWords.filter((w) => promptWords.has(w)).length;
      if (descHits > 0) {
        score += Math.min(0.25, (descHits / descWords.length) * 0.35);
      }

      if (score > highestScore) {
        highestScore = score;
        bestSkill = skill;
      }
    }

    // Confidence threshold
    if (bestSkill && highestScore >= 0.30) {
      return {
        matchedSkill: bestSkill,
        cleanedPrompt: prompt,
        isExplicitSlashCommand: false,
      };
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
    if (!this.filesLoaded) this.loadWorkspaceSkills();
    const all = [...BUILTIN_SKILLS, ...this.customSkills];
    return all.find((s) => s.slug === slug || s.slug === `/${slug.replace(/^\//, '')}`) || null;
  }
}
