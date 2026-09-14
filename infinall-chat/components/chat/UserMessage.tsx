"use client";

import { Message } from "@/components/workspace/SplitWorkspace";
import { Edit2, Check, X } from "lucide-react";
import { useState } from "react";

interface UserMessageProps {
  message: Message;
  onEditMessage?: (messageId: string, newContent: string) => void;
  isGenerating?: boolean;
}

export default function UserMessage({ message, onEditMessage, isGenerating }: UserMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.content);

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

  return (
    <div className="flex justify-end group">
      {isEditing ? (
        <div className="w-full max-w-[85%] flex flex-col gap-2 p-3 rounded-xl bg-zinc-900 border border-zinc-700">
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full bg-zinc-950 text-zinc-100 text-sm p-2 rounded-lg border border-zinc-800 focus:outline-none focus:border-cyan-500 resize-y min-h-[70px]"
            autoFocus
          />
          <div className="flex items-center justify-end gap-2 text-xs">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors"
            >
              <Check className="w-3 h-3" /> Save & Fork
            </button>
          </div>
        </div>
      ) : (
        <div className="relative max-w-[80%]">
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
          {onEditMessage && !isGenerating && (
            <button
              onClick={() => setIsEditing(true)}
              className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-all text-xs"
              title="Edit message and fork branch"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
