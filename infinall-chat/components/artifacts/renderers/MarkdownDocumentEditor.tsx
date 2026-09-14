"use client";

import { useState } from "react";
import { renderMarkdownToHtml } from "@/lib/utils/markdown";
import { Edit3, Eye, Copy, Check } from "lucide-react";

interface MarkdownDocumentEditorProps {
  content: string;
  isStreaming?: boolean;
  onContentChange?: (newContent: string) => void;
}

export default function MarkdownDocumentEditor({
  content,
  onContentChange,
}: MarkdownDocumentEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editableText, setEditableText] = useState(content);
  const [copied, setCopied] = useState(false);

  // Sync state when content updates from stream
  const activeContent = isEditing ? editableText : content;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditableText(val);
    if (onContentChange) {
      onContentChange(val);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Document Subheader */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b text-xs shrink-0"
        style={{ borderColor: "var(--color-border)", background: "rgba(0,0,0,0.3)" }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(false)}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
              !isEditing
                ? "bg-cyan-500/20 text-cyan-400 font-medium"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Reading View
          </button>
          <button
            onClick={() => {
              setEditableText(content);
              setIsEditing(true);
            }}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
              isEditing
                ? "bg-cyan-500/20 text-cyan-400 font-medium"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Mode
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-zinc-500 text-[11px]">
            {activeContent.split(/\s+/).filter(Boolean).length} words · {activeContent.length} chars
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        {isEditing ? (
          <textarea
            value={editableText}
            onChange={handleTextChange}
            placeholder="Type or edit markdown document..."
            className="w-full h-full min-h-[500px] bg-transparent text-zinc-100 font-mono text-sm leading-relaxed outline-none resize-none border-none"
            spellCheck={false}
          />
        ) : (
          <div
            className="prose-infinall max-w-4xl mx-auto"
            dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(content) }}
          />
        )}
      </div>
    </div>
  );
}
