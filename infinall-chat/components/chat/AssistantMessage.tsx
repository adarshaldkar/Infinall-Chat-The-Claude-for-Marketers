"use client";

import { Message } from "@/components/workspace/SplitWorkspace";
import ThinkingAccordion from "./ThinkingAccordion";
import ToolAccordion from "./ToolAccordion";
import ApprovalDiffCard from "./ApprovalDiffCard";
import ErrorBanner from "./ErrorBanner";
import { Copy, RefreshCw, Cpu } from "lucide-react";
import { useState } from "react";
import { renderMarkdownToHtml } from "@/lib/utils/markdown";

interface AssistantMessageProps {
  message: Message;
  isGenerating: boolean;
  statusMessage: string;
}

export default function AssistantMessage({ message, isGenerating, statusMessage }: AssistantMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isActiveMessage = message.isStreaming;

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
        <ApprovalDiffCard approval={message.approvalRequired} />
      )}

      {/* Assistant response text */}
      {message.content && (
        <div className="group relative">
          <div
            className="prose-infinall text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(message.content) }}
          />

          {/* Streaming cursor */}
          {message.isStreaming && message.content && (
            <span
              className="inline-block w-0.5 h-4 ml-0.5 animate-pulse"
              style={{ background: "var(--color-accent)" }}
            />
          )}

          {/* Hover actions — only when done */}
          {!message.isStreaming && message.content && (
            <div
              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-2"
            >
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors"
                style={{ color: "var(--color-text-muted)", background: "var(--color-card)" }}
              >
                <Copy className="w-3 h-3" />
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors"
                style={{ color: "var(--color-text-muted)", background: "var(--color-card)" }}
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
              {message.model && (
                <span
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs ml-auto"
                  style={{ color: "var(--color-muted)" }}
                >
                  <Cpu className="w-3 h-3" />
                  {message.model}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
