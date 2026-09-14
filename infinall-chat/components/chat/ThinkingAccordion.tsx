"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThinkingAccordionProps {
  content: string;
  isDone: boolean;
  statusMessage?: string;
}

export default function ThinkingAccordion({ content, isDone, statusMessage }: ThinkingAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const elapsedDisplay = content.length > 200 ? "~8s" : "~3s";
  const label = isDone ? `Thought for ${elapsedDisplay}` : (statusMessage || "Thinking...");

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}
    >
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left transition-colors"
        style={{ color: "var(--color-text-muted)" }}
      >
        <Brain
          className={cn("w-4 h-4 shrink-0", !isDone && "thinking-pulse")}
          style={{ color: "var(--color-accent)" }}
        />
        <span className="text-sm font-medium flex-1" style={{ color: "var(--color-text-muted)" }}>
          {label}
        </span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      {isOpen && content && (
        <div
          className="px-4 pb-4 text-xs leading-relaxed border-t font-mono"
          style={{
            color: "var(--color-muted)",
            borderColor: "var(--color-border)",
            background: "rgba(0,0,0,0.2)",
          }}
        >
          <div className="pt-3 whitespace-pre-wrap max-h-64 overflow-y-auto">{content}</div>
        </div>
      )}
    </div>
  );
}
