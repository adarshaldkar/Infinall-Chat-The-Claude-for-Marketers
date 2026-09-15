"use client";

import { Message } from "@/components/workspace/SplitWorkspace";
import ThinkingAccordion from "./ThinkingAccordion";
import ToolAccordion from "./ToolAccordion";
import ApprovalDiffCard from "./ApprovalDiffCard";
import ErrorBanner from "./ErrorBanner";
import CitationBadge from "./CitationBadge";
import ResearchProgressTree from "@/components/research/ResearchProgressTree";
import { Copy, RefreshCw, Cpu, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useState, useMemo } from "react";
import { renderMarkdownToHtml } from "@/lib/utils/markdown";
import ExportModal from "./ExportModal";

interface AssistantMessageProps {
  message: Message;
  activeSessionId: string | null;
  isGenerating: boolean;
  statusMessage: string;
  onRegenerate?: (messageId: string) => void;
  onSwitchVariant?: (messageId: string, variantIndex: number) => void;
}

export default function AssistantMessage({
  message,
  activeSessionId,
  isGenerating,
  statusMessage,
  onRegenerate,
  onSwitchVariant,
}: AssistantMessageProps) {
  const [copied, setCopied] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isActiveMessage = message.isStreaming;
  const variants = message.variants || (message.content ? [message.content] : []);
  const activeIndex = message.activeVariantIndex ?? (variants.length - 1);
  const currentContent = variants[activeIndex] || message.content;

  // Aggregate all sources from tool calls
  const allSources = useMemo(() => {
    const sources: Array<{ id: string; url: string; title: string; domain: string; snippet?: string }> = [];
    (message.toolCalls ?? []).forEach((tc) => {
      (tc.sources ?? []).forEach((s) => {
        if (!sources.some((existing) => existing.url === s.url)) {
          sources.push({ ...s, id: String(s.id) });
        }
      });
    });
    return sources;
  }, [message.toolCalls]);

  return (
    <div className="flex flex-col gap-3">
      {/* Thinking accordion */}
      {(message.thinking || isActiveMessage) && (
        <ThinkingAccordion
          content={message.thinking ?? ""}
          isDone={message.thinkingDone ?? false}
          statusMessage={isActiveMessage ? statusMessage : ""}
        />
      )}

      {/* Deep research multi-agent progress tree */}
      {(message.researchWorkers ?? []).length > 0 && (
        <ResearchProgressTree
          workers={message.researchWorkers ?? []}
          isSynthesizing={message.researchSynthesizing}
          isComplete={message.researchComplete}
        />
      )}

      {/* Tool activity accordions */}
      {(message.toolCalls ?? []).length > 0 && (
        <div className="space-y-2">
          {(message.toolCalls ?? []).map((tc) => (
            <ToolAccordion key={tc.callId} toolCall={tc} />
          ))}
        </div>
      )}

      {/* Error banner */}
      {message.error && (
        <ErrorBanner
          message={message.error.message}
          recoverable={message.error.recoverable}
        />
      )}

      {/* Approval diff card */}
      {message.approvalRequired && (
        <ApprovalDiffCard sessionId={activeSessionId} approval={message.approvalRequired} />
      )}

      {/* Assistant response text */}
      {currentContent && (
        <div className="group relative">
          <div
            className="prose-infinall text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(currentContent) }}
          />

          {/* Streaming cursor */}
          {message.isStreaming && currentContent && (
            <span
              className="inline-block w-0.5 h-4 ml-0.5 animate-pulse"
              style={{ background: "var(--color-accent)" }}
            />
          )}

          {/* Interactive Verified Sources Citation Strip */}
          {allSources.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-2.5 pt-1.5 border-t border-zinc-800/60">
              <span className="text-[11px] text-zinc-500 font-medium">Verified Citations:</span>
              {allSources.map((source, idx) => (
                <CitationBadge
                  key={`citation-${message.id}-${idx}-${source.url}`}
                  index={idx + 1}
                  url={source.url}
                  title={source.title}
                  domain={source.domain}
                  snippet={source.snippet}
                />
              ))}
            </div>
          )}

          {/* Hover actions & Branching controls */}
          {!message.isStreaming && currentContent && (
            <div className="flex items-center gap-1.5 mt-2.5 pt-1 text-xs text-zinc-400">
              {/* Branch navigation if multiple variants exist (< 1 of 2 >) */}
              {variants.length > 1 && (
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-0.5 mr-1">
                  <button
                    onClick={() => onSwitchVariant && onSwitchVariant(message.id, Math.max(0, activeIndex - 1))}
                    disabled={activeIndex === 0}
                    className="p-0.5 hover:text-white disabled:opacity-30 transition-opacity"
                    title="Previous response variant"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <span className="font-mono text-[11px] text-zinc-300">
                    {activeIndex + 1} of {variants.length}
                  </span>
                  <button
                    onClick={() => onSwitchVariant && onSwitchVariant(message.id, Math.min(variants.length - 1, activeIndex + 1))}
                    disabled={activeIndex === variants.length - 1}
                    className="p-0.5 hover:text-white disabled:opacity-30 transition-opacity"
                    title="Next response variant"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors border border-zinc-800/80 shadow-sm"
                style={{ background: "var(--color-card)" }}
              >
                <Copy className="w-3 h-3 text-zinc-400" />
                {copied ? "Copied!" : "Copy"}
              </button>

              {/* Message Export Option */}
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-cyan-400 transition-colors border border-zinc-800/80 shadow-sm"
                style={{ background: "var(--color-card)" }}
                title="Export deliverable (PDF, Word, PPTX, HTML, Markdown)"
              >
                <Download className="w-3 h-3 text-cyan-400" />
                <span>Export</span>
              </button>

              {onRegenerate && (
                <button
                  onClick={() => onRegenerate(message.id)}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-zinc-800 disabled:opacity-50 text-zinc-300 hover:text-white transition-colors border border-zinc-800/80 shadow-sm"
                  style={{ background: "var(--color-card)" }}
                  title="Generate alternative response (creates new branch)"
                >
                  <RefreshCw className="w-3 h-3 text-zinc-400" />
                  Retry
                </button>
              )}

              {message.model && (
                <span
                  className="flex items-center gap-1 px-2 py-1 rounded-lg ml-auto text-zinc-500 font-mono text-[11px]"
                >
                  <Cpu className="w-3 h-3" />
                  {message.model}
                </span>
              )}
            </div>
          )}

          {/* Export Modal */}
          <ExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            title="Strategic_Intelligence_Brief"
            content={currentContent}
          />
        </div>
      )}
    </div>
  );
}
