"use client";

// ============================================================
// UserMessage Component
// Inline Editing + Forking + Claude-style < 1 of N > Branch Navigation
// ============================================================

import { Message } from "@/components/workspace/SplitWorkspace";
import { Edit2, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface UserMessageProps {
  message: Message;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onSwitchVariant?: (messageId: string, variantIndex: number) => void;
  isGenerating?: boolean;
}

export default function UserMessage({
  message,
  onEditMessage,
  onSwitchVariant,
  isGenerating,
}: UserMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.content);

  const variants = message.variants || [message.content];
  const activeIndex = message.activeVariantIndex ?? 0;
  const totalVariants = variants.length;

  const handleSave = () => {
    if (editedText.trim() && editedText !== message.content && onEditMessage) {
      onEditMessage(message.id, editedText.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedText(message.content);
    setIsEditing(false);
  };

  const handlePrevVariant = () => {
    if (activeIndex > 0 && onSwitchVariant) {
      onSwitchVariant(message.id, activeIndex - 1);
    }
  };

  const handleNextVariant = () => {
    if (activeIndex < totalVariants - 1 && onSwitchVariant) {
      onSwitchVariant(message.id, activeIndex + 1);
    }
  };

  return (
    <div className="flex justify-end group">
      {isEditing ? (
        <div className="w-full max-w-[85%] flex flex-col gap-2 p-3 rounded-xl bg-zinc-900 border border-zinc-700 shadow-xl">
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full bg-zinc-950 text-zinc-100 text-sm p-3 rounded-lg border border-zinc-800 focus:outline-none focus:border-cyan-500 resize-y min-h-[75px]"
            autoFocus
          />
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-zinc-500 text-[11px]">Editing creates a new conversation branch</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-3 h-3" /> Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors shadow-sm"
              >
                <Check className="w-3 h-3" /> Save & Fork
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-end gap-1.5 max-w-[80%]">
          <div className="relative group/bubble">
            <div
              className="px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed"
              style={{
                background: "var(--color-card)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
              }}
            >
              {message.content}
            </div>

            {/* Edit Button */}
            {onEditMessage && !isGenerating && (
              <button
                onClick={() => {
                  setEditedText(message.content);
                  setIsEditing(true);
                }}
                className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover/bubble:opacity-100 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-all text-xs"
                title="Edit message and fork branch"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Claude-style < 1 of N > Branch Navigator */}
          {totalVariants > 1 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 select-none">
              <button
                onClick={handlePrevVariant}
                disabled={activeIndex === 0}
                className="p-0.5 rounded hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Previous branch"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span className="font-mono text-[10px] px-1 font-medium text-zinc-300">
                {activeIndex + 1} of {totalVariants}
              </span>
              <button
                onClick={handleNextVariant}
                disabled={activeIndex === totalVariants - 1}
                className="p-0.5 rounded hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Next branch"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
