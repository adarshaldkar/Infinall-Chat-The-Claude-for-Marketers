"use client";

import { useRef, useState, useEffect, KeyboardEvent } from "react";
import { Send, Square, Paperclip, Mic, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import SkillsMenuPopover from "@/components/skills/SkillsMenuPopover";
import ResearchModeToggle from "@/components/research/ResearchModeToggle";
import AttachmentPreviewBar from "@/components/multimodal/AttachmentPreviewBar";
import { UploadedAttachment } from "@/lib/multimodal/types";

const MODELS = [
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "Kimi-K2.6", label: "Kimi K2.6" },
];

interface ComposerProps {
  isGenerating: boolean;
  onSend: (content: string, modelId: string, options?: { isDeepResearch?: boolean; attachments?: UploadedAttachment[] }) => void;
  onStop: () => void;
}

export default function Composer({ isGenerating, onSend, onStop }: ComposerProps) {
  const [value, setValue] = useState("");
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [modelOpen, setModelOpen] = useState(false);
  const [isDeepResearch, setIsDeepResearch] = useState(false);
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Slash skills state
  const [isSkillsMenuOpen, setIsSkillsMenuOpen] = useState(false);
  const [skillsFilter, setSkillsFilter] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Detect slash command typing
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setValue(val);

    if (val.startsWith("/") && !val.includes(" ")) {
      setIsSkillsMenuOpen(true);
      setSkillsFilter(val);
    } else {
      setIsSkillsMenuOpen(false);
    }
  };

  const handleSelectSkill = (slug: string) => {
    setValue(`${slug} `);
    setIsSkillsMenuOpen(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isSkillsMenuOpen && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Tab")) {
      // Allow popover keyboard handler to intercept
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.attachment) {
            setAttachments((prev) => [...prev, data.attachment]);
          }
        }
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || isGenerating) return;

    onSend(trimmed, selectedModel.id, {
      isDeepResearch,
      attachments,
    });

    setValue("");
    setAttachments([]);
    setIsSkillsMenuOpen(false);
  };

  return (
    <div
      className="relative rounded-2xl border p-2 shadow-sm transition-colors"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      {/* Slash command autocomplete popup */}
      <SkillsMenuPopover
        isOpen={isSkillsMenuOpen}
        filterText={skillsFilter}
        onSelectSkill={handleSelectSkill}
        onClose={() => setIsSkillsMenuOpen(false)}
      />

      {/* Attachment Chips Bar */}
      <AttachmentPreviewBar
        attachments={attachments}
        onRemoveAttachment={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
      />

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={
          isDeepResearch
            ? "Enter deep research topic or competitive analysis objective..."
            : "Ask Infinall or type / for skills (/ad-copy, /brand-voice, /seo-audit)..."
        }
        rows={1}
        className="w-full resize-none bg-transparent text-sm px-2 py-2 outline-none leading-relaxed"
        style={{ color: "var(--color-text)", minHeight: "44px", maxHeight: "180px" }}
      />

      {/* Hidden file upload input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.docx,.csv"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Bottom toolbar */}
      <div className="flex items-center justify-between mt-1 px-1">
        {/* Left controls: file attach, research toggle, model selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-1.5 rounded-lg transition-colors hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            title="Attach image creative, PDF, or CSV"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <Paperclip className="w-4 h-4" />
            )}
          </button>

          {/* Deep Research Mode Toggle */}
          <ResearchModeToggle
            isDeepResearch={isDeepResearch}
            onToggle={() => setIsDeepResearch((prev) => !prev)}
          />

          {/* Model selector */}
          <div className="relative">
            <button
              type="button"
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
                    type="button"
                    onClick={() => {
                      setSelectedModel(model);
                      setModelOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm transition-colors"
                    style={{
                      color: selectedModel.id === model.id ? "var(--color-accent)" : "var(--color-text)",
                      background:
                        selectedModel.id === model.id ? "rgba(34,211,238,0.1)" : "transparent",
                    }}
                  >
                    {model.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Send / Stop button */}
        {isGenerating ? (
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: "var(--color-error)", color: "white" }}
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!value.trim() && attachments.length === 0}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-200",
              value.trim() || attachments.length > 0
                ? "opacity-100 hover:scale-105"
                : "opacity-30 cursor-not-allowed"
            )}
            style={{
              background: value.trim() || attachments.length > 0 ? "var(--color-accent)" : "var(--color-border)",
              color: "white",
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Hint */}
      <p className="text-center text-[11px] mt-1.5 text-zinc-500 font-mono">
        Enter to send · Shift+Enter for new line · Type / for Skills
      </p>
    </div>
  );
}
