"use client";

import { Sparkles, TrendingUp, BarChart2, Target, Zap } from "lucide-react";

const SUGGESTIONS = [
  {
    icon: TrendingUp,
    title: "Competitor Analysis",
    prompt: "Compare HubSpot and Salesforce 2026 pricing and generate an ROI calculator for our sales team",
  },
  {
    icon: Target,
    title: "Campaign Strategy",
    prompt: "Build a complete Q3 GTM strategy targeting SaaS founders with budget breakdown and channel mix",
  },
  {
    icon: Zap,
    title: "Ad Copywriting",
    prompt: "Write 5 high-converting Meta ad variations for a B2B SaaS product targeting marketing managers",
  },
  {
    icon: BarChart2,
    title: "Marketing Report",
    prompt: "Generate a competitive landscape analysis of the top 5 CRM tools with a comparison matrix",
  },
];

interface EmptyStateProps {
  onSendMessage: (content: string, modelId: string) => void;
}

export default function EmptyState({ onSendMessage }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
      {/* Logo mark */}
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg"
        style={{ background: "linear-gradient(135deg, var(--color-accent), #c46244)" }}
      >
        <Sparkles className="w-7 h-7 text-white" />
      </div>

      <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--color-text)" }}>
        What can I help you market today?
      </h1>
      <p className="text-sm mb-10 max-w-md" style={{ color: "var(--color-text-muted)" }}>
        I&apos;m your autonomous AI marketing strategist. I can research competitors, build campaigns,
        write copy, and create live interactive reports — all in one workspace.
      </p>

      {/* Suggestion cards */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
        {SUGGESTIONS.map(({ icon: Icon, title, prompt }) => (
          <button
            key={title}
            onClick={() => onSendMessage(prompt, "claude-sonnet-4-6")}
            className="text-left p-4 rounded-xl border transition-all duration-200 group"
            style={{
              background: "var(--color-card)",
              borderColor: "var(--color-border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--color-accent)";
              e.currentTarget.style.background = "#2a2a2e";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border)";
              e.currentTarget.style.background = "var(--color-card)";
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(218,119,86,0.15)" }}
              >
                <Icon className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
              </div>
              <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                {title}
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              {prompt.slice(0, 80)}...
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
