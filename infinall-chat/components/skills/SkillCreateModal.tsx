"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Zap,
  Globe,
  Users,
  Lock,
  FileText,
  FileCode,
  Presentation,
  Check,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { SkillCategory, CompleteSkill } from "@/lib/skills/types";

interface SkillCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkillCreated?: (skill: CompleteSkill) => void;
}

const CATEGORIES: { id: SkillCategory; label: string }[] = [
  { id: "strategy", label: "Strategy & GTM" },
  { id: "paid_media", label: "Paid Media & Ads" },
  { id: "seo_content", label: "SEO & Content" },
  { id: "crm_retention", label: "CRM & Retention" },
  { id: "cro_conversion", label: "CRO & Conversion" },
  { id: "custom", label: "Custom Domain" },
];

const DELIVERABLES = [
  { id: "markdown", label: "Markdown Brief", icon: FileText },
  { id: "html", label: "Interactive HTML / App", icon: FileCode },
  { id: "docx", label: "Word Document", icon: FileText },
  { id: "pptx", label: "Slide Deck (PPTX)", icon: Presentation },
];

export default function SkillCreateModal({
  isOpen,
  onClose,
  onSkillCreated,
}: SkillCreateModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState<SkillCategory>("strategy");
  const [scope, setScope] = useState<"personal" | "team" | "catalog">("personal");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [defaultArtifact, setDefaultArtifact] = useState<"markdown" | "html" | "docx" | "pptx">("markdown");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-generate slug as user types name if slug hasn't been manually diverged
  const handleNameChange = (val: string) => {
    setName(val);
    const autoSlug = "/" + val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    setSlug(autoSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !systemPrompt.trim()) {
      setErrorMsg("Please fill in Name, Trigger Description, and System Prompt.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const payload = {
        name: name.trim(),
        slug: slug.trim() || `/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        category,
        scope,
        description: description.trim(),
        triggerKeywords: keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        systemPromptInjection: systemPrompt.trim(),
        defaultArtifactType: defaultArtifact,
        icon: "Sparkles",
      };

      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create skill");
      }

      const data = await res.json();
      if (onSkillCreated && data.skill) {
        onSkillCreated(data.skill);
      }

      // Reset form & close
      setName("");
      setSlug("");
      setDescription("");
      setKeywords("");
      setSystemPrompt("");
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create skill");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 p-0 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="p-5 pb-3 border-b border-zinc-800/80 bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                Create Custom Marketing Skill
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                Define specialized marketing instructions, frameworks, and slash triggers.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Name & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Skill Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. SaaS Pricing Teardown"
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Slash Command Trigger
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="/pricing-teardown"
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-mono text-cyan-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Category & Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SkillCategory)}
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Sharing Scope</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setScope("personal")}
                  className={`flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-xs font-medium border transition-all ${
                    scope === "personal"
                      ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Lock className="w-3 h-3" /> Personal
                </button>
                <button
                  type="button"
                  onClick={() => setScope("team")}
                  className={`flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-xs font-medium border transition-all ${
                    scope === "team"
                      ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Users className="w-3 h-3" /> Team
                </button>
                <button
                  type="button"
                  onClick={() => setScope("catalog")}
                  className={`flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-xs font-medium border transition-all ${
                    scope === "catalog"
                      ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Globe className="w-3 h-3" /> Catalog
                </button>
              </div>
            </div>
          </div>

          {/* Trigger Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Trigger Description <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary shown in autocomplete menu..."
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          {/* Trigger Keywords */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Natural Language Trigger Keywords (comma separated)
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="pricing audit, saas pricing, packaging tier, annual discount"
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Default Deliverable */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Primary Output Format
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DELIVERABLES.map((deliv) => {
                const Icon = deliv.icon;
                const isSel = defaultArtifact === deliv.id;
                return (
                  <button
                    key={deliv.id}
                    type="button"
                    onClick={() => setDefaultArtifact(deliv.id as "markdown" | "html" | "docx" | "pptx")}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs text-left transition-all ${
                      isSel
                        ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
                        : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="truncate">{deliv.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* System Prompt / Instructions Editor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-300">
                System Prompt & Framework Instructions <span className="text-rose-400">*</span>
              </label>
              <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                <HelpCircle className="w-3 h-3" /> Supports Markdown & guidelines
              </span>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={`### ACTIVE SKILL: SAAS PRICING TEARDOWN
You are an expert Chief Monetization Officer.
Analyze the target brand's pricing structure across:
1. Packaging & Tier Alignment (Good-Better-Best)
2. Feature Gating & Value Metric
3. Discounting & Annual Pre-pay Incentive
4. Recommended Tier Restructuring Matrix`}
              rows={6}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg p-3 text-xs font-mono text-zinc-100 focus:outline-none focus:border-cyan-500 resize-y"
              required
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs border border-zinc-700 hover:bg-zinc-800 text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-md disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering Skill...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save & Register Skill</span>
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
