"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Globe,
  ExternalLink,
  BarChart2,
  Megaphone,
  Target,
  FileText,
  Terminal,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { SourceCitation } from "@/lib/gateway/types";

interface ToolCall {
  callId: string;
  toolName: string;
  queries?: string[];
  args?: Record<string, unknown>;
  result?: unknown;
  sources?: SourceCitation[];
  status?: "running" | "done" | "error";
}

interface ToolAccordionProps {
  toolCall: ToolCall;
}

function getToolMeta(toolName: string) {
  switch (toolName) {
    case "web_search":
      return {
        label: "Searched the web",
        icon: Globe,
        color: "#22d3ee",
      };
    case "firecrawl_scrape":
      return {
        label: "Scraped web page",
        icon: FileText,
        color: "#38bdf8",
      };
    case "ga4_metrics":
      return {
        label: "Queried Google Analytics 4",
        icon: BarChart2,
        color: "#f59e0b",
      };
    case "meta_ads_read":
      return {
        label: "Queried Meta Ads API",
        icon: Megaphone,
        color: "#6366f1",
      };
    case "google_ads_read":
      return {
        label: "Queried Google Ads API",
        icon: Target,
        color: "#10b981",
      };
    default:
      return {
        label: `Executed ${toolName.replace(/_/g, " ")}`,
        icon: Terminal,
        color: "#a855f7",
      };
  }
}

export default function ToolAccordion({ toolCall }: ToolAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const sources = (toolCall.sources ?? []) as SourceCitation[];
  const queries = toolCall.queries ?? [];
  const meta = getToolMeta(toolCall.toolName || "tool");
  const Icon = meta.icon;
  const isRunning = toolCall.status === "running";
  const isError = toolCall.status === "error";

  // Format arguments for display if not empty
  const rawArgs = toolCall.args ?? {};
  const hasArgs = Object.keys(rawArgs).length > 0;

  // Format result for display if not empty
  const hasResult = toolCall.result !== undefined && toolCall.result !== null;
  const resultString =
    hasResult && typeof toolCall.result === "string"
      ? toolCall.result
      : hasResult
      ? JSON.stringify(toolCall.result, null, 2)
      : null;

  return (
    <div
      className="rounded-xl border overflow-hidden transition-colors"
      style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}
    >
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
        style={{ color: "var(--color-text-muted)" }}
      >
        <Icon className="w-4 h-4 shrink-0" style={{ color: meta.color }} />
        <span className="text-sm font-medium flex-1 flex items-center gap-2" style={{ color: "var(--color-text)" }}>
          {meta.label}
          {queries.length > 0 && (
            <span className="text-xs font-normal" style={{ color: "var(--color-text-muted)" }}>
              · {queries.length} {queries.length === 1 ? "query" : "queries"}
              {sources.length > 0 && `, ${sources.length} sources`}
            </span>
          )}
        </span>

        {/* Status indicator */}
        {isRunning && (
          <span className="flex items-center gap-1.5 text-xs text-amber-400 font-medium mr-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Running
          </span>
        )}
        {isError && (
          <span className="flex items-center gap-1 text-xs text-rose-400 font-medium mr-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Failed
          </span>
        )}
        {!isRunning && !isError && sources.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium mr-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {sources.length} citations
          </span>
        )}

        {isOpen ? (
          <ChevronDown className="w-4 h-4 shrink-0 text-zinc-400" />
        ) : (
          <ChevronRight className="w-4 h-4 shrink-0 text-zinc-400" />
        )}
      </button>

      {isOpen && (
        <div
          className="px-4 py-3.5 border-t space-y-3.5 text-xs"
          style={{ borderColor: "var(--color-border)", background: "rgba(0,0,0,0.15)" }}
        >
          {/* Query pills */}
          {queries.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--color-text-muted)" }}>
                Search Queries
              </div>
              <div className="flex flex-wrap gap-2">
                {queries.map((q, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-md text-xs font-medium border"
                    style={{
                      background: "rgba(34,211,238,0.08)",
                      borderColor: "rgba(34,211,238,0.25)",
                      color: "#22d3ee",
                    }}
                  >
                    "{q}"
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Source cards */}
          {sources.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--color-text-muted)" }}>
                Citations & Sources ({sources.length})
              </div>
              <div className="grid grid-cols-1 gap-2">
                {sources.slice(0, 6).map((source) => (
                  <a
                    key={source.id}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2.5 p-2.5 rounded-lg border transition-all group"
                    style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.02)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = "var(--color-accent)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = "var(--color-border)")
                    }
                  >
                    <span
                      className="text-[11px] font-bold w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "rgba(255,255,255,0.06)", color: "var(--color-accent)" }}
                    >
                      {source.id}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold truncate" style={{ color: "var(--color-text)" }}>
                          {source.title}
                        </p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-text-muted)" }}>
                          {source.domain}
                        </span>
                      </div>
                      {source.snippet && (
                        <p
                          className="text-[11px] mt-1 line-clamp-2 leading-relaxed"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {source.snippet}
                        </p>
                      )}
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" style={{ color: "var(--color-accent)" }} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Tool Arguments (if not redundant with query pills) */}
          {hasArgs && queries.length === 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--color-text-muted)" }}>
                Parameters
              </div>
              <pre
                className="p-2.5 rounded-lg border font-mono text-[11px] overflow-x-auto"
                style={{ borderColor: "var(--color-border)", background: "rgba(0,0,0,0.3)", color: "var(--color-text-muted)" }}
              >
                {JSON.stringify(rawArgs, null, 2)}
              </pre>
            </div>
          )}

          {/* Structured Output / Result (if no sources or for analytical tools) */}
          {hasResult && sources.length === 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--color-text-muted)" }}>
                Tool Output
              </div>
              <pre
                className="p-2.5 rounded-lg border font-mono text-[11px] overflow-x-auto max-h-48 leading-relaxed"
                style={{ borderColor: "var(--color-border)", background: "rgba(0,0,0,0.3)", color: "var(--color-text)" }}
              >
                {resultString}
              </pre>
            </div>
          )}

          {/* Running State Fallback */}
          {isRunning && sources.length === 0 && !hasResult && (
            <div className="py-2 flex items-center gap-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>Fetching live tool output and verified sources...</span>
            </div>
          )}

          {/* Empty / Completed Fallback */}
          {!isRunning && sources.length === 0 && !hasResult && queries.length === 0 && (
            <div className="py-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
              Tool executed successfully with no additional output data.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
