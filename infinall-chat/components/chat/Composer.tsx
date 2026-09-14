"use client";

import { useRef, useState, useEffect, KeyboardEvent } from "react";
import { Send, Square, Paperclip, Mic, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const MODELS = [
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "Kimi-K2.6", label: "Kimi K2.6" },
];

interface ComposerProps {
  isGenerating: boolean;
  onSend: (content: string, modelId: string) => void;
  onStop: () => void;
}

export default function Composer({ isGenerating, onSend, onStop }: ComposerProps) {
  const [value, setValue] = useState("");
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [modelOpen, setModelOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }, [value]);

  // Focus after response
  useEffect(() => {
    if (!isGenerating) textareaRef.current?.focus();
  }, [isGenerating]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isGenerating) return;
    onSend(trimmed, selectedModel.id);
    setValue("");
  };

  return (
    <div
      className="rounded-2xl border p-2"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask Infinall anything about your marketing strategy..."
        rows={1}
        className="w-full resize-none bg-transparent text-sm px-2 py-2 outline-none leading-relaxed"
        style={{ color: "var(--color-text)", minHeight: "44px", maxHeight: "180px" }}
      />

      {/* Bottom toolbar */}
      <div className="flex items-center justify-between mt-1 px-1">
        {/* Left: attachments, voice, model selector */}
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--color-muted)" }}
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--color-muted)" }}
            title="Voice input"
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Model selector */}
          <div className="relative ml-1">
            <button
              onClick={() => setModelOpen((p) => !p)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors"
              style={{
                color: "var(--color-text-muted)",
                borderColor: "var(--color-border)",
                background: "var(--color-canvas)",
              }}
            >
              {selectedModel.label}
              <ChevronDown className="w-3 h-3" />
            </button>

            {modelOpen && (
              <div
                className="absolute bottom-full mb-1 left-0 rounded-xl border shadow-xl overflow-hidden z-50 min-w-48"
                style={{
                  background: "var(--color-card)",
                  borderColor: "var(--color-border)",
                }}
              >
                {MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => { setSelectedModel(model); setModelOpen(false); }}
                    className="w-full text-left px-3 py-2.5 text-sm transition-colors"
                    style={{
                      color: selectedModel.id === model.id ? "var(--color-accent)" : "var(--color-text)",
                      background:
                        selectedModel.id === model.id
                          ? "rgba(218,119,86,0.1)"
                          : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedModel.id !== model.id)
                        e.currentTarget.style.background = "var(--color-border)";
                    }}
                    onMouseLeave={(e) => {
                      if (selectedModel.id !== model.id)
                        e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {model.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: send / stop button */}
        {isGenerating ? (
          <button
            onClick={onStop}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: "var(--color-error)", color: "white" }}
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Stop
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!value.trim()}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-200",
              value.trim()
                ? "opacity-100"
                : "opacity-30 cursor-not-allowed"
            )}
            style={{
              background: value.trim() ? "var(--color-accent)" : "var(--color-border)",
              color: "white",
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Hint */}
      <p className="text-center text-xs mt-1.5" style={{ color: "var(--color-muted)" }}>
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
