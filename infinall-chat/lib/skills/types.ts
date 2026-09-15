// ============================================================
// Infinall Chat - Progressive Skills Architecture Types
// ============================================================

export type SkillCategory =
  | 'strategy'
  | 'paid_media'
  | 'seo_content'
  | 'crm_retention'
  | 'cro_conversion'
  | 'custom';

export interface SkillManifest {
  slug: string; // e.g. '/ad-copy'
  name: string;
  category: SkillCategory;
  description: string;
  triggerKeywords: string[];
  icon: string;
  estimatedTokens: number;
  scope?: 'personal' | 'team' | 'catalog';
  projectId?: string;
}

export interface SkillRule {
  id: string;
  name: string;
  instruction: string;
  enforceFormat?: string;
  exampleOutputs?: string[];
}

export interface CompleteSkill extends SkillManifest {
  systemPromptInjection: string;
  rules: SkillRule[];
  suggestedTools: string[];
  defaultArtifactType?: 'html' | 'markdown' | 'docx' | 'pptx' | 'xlsx';
}

export interface SkillResolutionResult {
  matchedSkill: CompleteSkill | null;
  cleanedPrompt: string;
  isExplicitSlashCommand: boolean;
}
