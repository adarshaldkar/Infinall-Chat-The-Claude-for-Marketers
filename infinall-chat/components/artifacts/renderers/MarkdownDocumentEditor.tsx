"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { renderMarkdownToHtml } from "@/lib/utils/markdown";
import {
  Edit3,
  Eye,
  Columns,
  Copy,
  Check,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Table as TableIcon,
  Minus,
  Link as LinkIcon,
  Sparkles,
} from "lucide-react";

interface MarkdownDocumentEditorProps {
  content: string;
  isStreaming?: boolean;
  onContentChange?: (newContent: string) => void;
}

type ViewMode = "preview" | "edit" | "split";

export default function MarkdownDocumentEditor({
  content,
  onContentChange,
}: MarkdownDocumentEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [editableText, setEditableText] = useState(content);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state when content updates externally
  useEffect(() => {
    if (content !== editableText && viewMode === "preview") {
      setEditableText(content);
    }
  }, [content, viewMode]);

  const activeContent = viewMode === "preview" ? content : editableText;

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

  // Helper for wrapping selected text or inserting markdown tokens
  const insertToken = useCallback(
    (prefix: string, suffix: string = "", defaultPlaceholder: string = "text") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = editableText.substring(start, end) || defaultPlaceholder;

      const replacement = `${prefix}${selected}${suffix}`;
      const newText = editableText.substring(0, start) + replacement + editableText.substring(end);

      setEditableText(newText);
      if (onContentChange) onContentChange(newText);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
      }, 10);
    },
    [editableText, onContentChange]
  );

  // Helper for prefixing current line(s)
  const prefixLine = useCallback(
    (linePrefix: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const before = editableText.substring(0, start);
      const after = editableText.substring(end);
      const selected = editableText.substring(start, end);

      const lines = selected ? selected.split("\n") : [editableText.substring(before.lastIndexOf("\n") + 1, end)];
      const prefixed = lines.map((l) => `${linePrefix} ${l.replace(/^([#*-]|\d+\.)\s+/, "")}`).join("\n");

      let newText: string;
      if (selected) {
        newText = before + prefixed + after;
      } else {
        const lineStart = before.lastIndexOf("\n") + 1;
        newText = editableText.substring(0, lineStart) + `${linePrefix} ` + editableText.substring(lineStart);
      }

      setEditableText(newText);
      if (onContentChange) onContentChange(newText);

      setTimeout(() => {
        textarea.focus();
      }, 10);
    },
    [editableText, onContentChange]
  );

  // Insert structured Markdown Table template
  const insertTable = useCallback(() => {
    const tableTemplate = `\n| Metric / Feature | Baseline | Target / Benchmark | Lift / Uplift |\n| :--- | :--- | :--- | :--- |\n| Conversion Rate | 2.4% | 4.1% | +70.8% |\n| Customer CAC ($) | $48.50 | $34.20 | -29.5% |\n| Blended ROAS | 3.2x | 4.8x | +50.0% |\n\n`;
    insertToken(tableTemplate, "", "");
  }, [insertToken]);

  // Keyboard Shortcuts handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      insertToken("**", "**", "bold text");
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      insertToken("*", "*", "italic text");
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      insertToken("[", "](https://infinall.ai)", "link title");
    } else if (e.key === "Tab") {
      e.preventDefault();
      insertToken("  ", "", "");
    }
  };

  // Content analytics calculations
  const wordCount = activeContent.split(/\s+/).filter(Boolean).length;
  const charCount = activeContent.length;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden text-zinc-100">
      {/* Top Document Header & Mode Switcher */}
      <div
        className="flex flex-wrap items-center justify-between px-4 py-2.5 border-b gap-2 text-xs shrink-0 select-none"
        style={{ borderColor: "var(--color-border, #27272a)", background: "rgba(9, 9, 11, 0.75)" }}
      >
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewMode("preview")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs ${
              viewMode === "preview"
                ? "bg-amber-500/15 text-amber-400 font-medium border border-amber-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Reading View
          </button>
          <button
            onClick={() => {
              setEditableText(content);
              setViewMode("edit");
            }}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs ${
              viewMode === "edit"
                ? "bg-amber-500/15 text-amber-400 font-medium border border-amber-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Editor View
          </button>
          <button
            onClick={() => {
              setEditableText(content);
              setViewMode("split");
            }}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs ${
              viewMode === "split"
                ? "bg-amber-500/15 text-amber-400 font-medium border border-amber-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            Split View
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-zinc-500 text-[11px] hidden sm:inline-flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400/70" />
            {wordCount} words · {charCount} chars · ~{readingTimeMin} min read
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-300 hover:text-zinc-100 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
            {copied ? "Copied" : "Copy Document"}
          </button>
        </div>
      </div>

      {/* Rich Markdown Formatting Toolbar (Visible in Edit & Split View) */}
      {viewMode !== "preview" && (
        <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-zinc-900/60 border-b border-zinc-800 text-zinc-400 text-xs shrink-0 select-none overflow-x-auto">
          <button
            title="Heading 1"
            onClick={() => prefixLine("#")}
            className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            title="Heading 2"
            onClick={() => prefixLine("##")}
            className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            title="Heading 3"
            onClick={() => prefixLine("###")}
            className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <Heading3 className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-zinc-800 mx-1" />

          <button
            title="Bold (Ctrl+B)"
            onClick={() => insertToken("**", "**", "bold text")}
            className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors font-bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            title="Italic (Ctrl+I)"
            onClick={() => insertToken("*", "*", "italic text")}
            className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            title="Strikethrough"
            onClick={() => insertToken("~~", "~~", "strikethrough text")}
            className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-zinc-800 mx-1" />

          <button
            title="Bullet List"
            onClick={() => prefixLine("-")}
            className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            title="Numbered List"
            onClick={() => prefixLine("1.")}
            className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            title="Blockquote"
            onClick={() => prefixLine(">")}
            className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <Quote className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-zinc-800 mx-1" />

          <button
            title="Inline Code"
            onClick={() => insertToken("`", "`", "code")}
            className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            title="Code Block"
            onClick={() => insertToken("```markdown\n", "\n```", "code block content")}
            className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors font-mono text-[11px]"
          >
            {"{ }"}
          </button>
          <button
            title="Insert Table"
            onClick={insertTable}
            className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <TableIcon className="w-4 h-4" />
          </button>
          <button
            title="Link (Ctrl+K)"
            onClick={() => insertToken("[", "](https://infinall.ai)", "link title")}
            className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button
            title="Horizontal Divider"
            onClick={() => insertToken("\n\n---\n\n", "", "")}
            className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Content Rendering Canvas */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "preview" && (
          <div className="h-full overflow-y-auto p-6 sm:p-10">
            <div
              className="prose-infinall max-w-4xl mx-auto text-zinc-100"
              dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(content) }}
            />
          </div>
        )}

        {viewMode === "edit" && (
          <div className="h-full p-4 sm:p-6 flex flex-col">
            <textarea
              ref={textareaRef}
              value={editableText}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Draft or edit marketing artifact content..."
              className="w-full h-full bg-zinc-900/30 text-zinc-100 font-mono text-sm leading-relaxed p-4 rounded-xl border border-zinc-800/80 focus:border-amber-500/50 outline-none resize-none transition-colors"
              spellCheck={false}
            />
          </div>
        )}

        {viewMode === "split" && (
          <div className="grid grid-cols-1 md:grid-cols-2 h-full divide-y md:divide-y-0 md:divide-x divide-zinc-800 overflow-hidden">
            {/* Left Editor */}
            <div className="h-full p-4 flex flex-col overflow-hidden bg-zinc-950">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 px-1">
                Markdown Source
              </div>
              <textarea
                ref={textareaRef}
                value={editableText}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder="Type or format markdown..."
                className="w-full flex-1 bg-zinc-900/40 text-zinc-100 font-mono text-xs leading-relaxed p-3.5 rounded-lg border border-zinc-800 focus:border-amber-500/50 outline-none resize-none"
                spellCheck={false}
              />
            </div>

            {/* Right Live Preview */}
            <div className="h-full overflow-y-auto p-6 bg-zinc-900/10">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/80 mb-4 px-1">
                Live Formatted Preview
              </div>
              <div
                className="prose-infinall text-zinc-100"
                dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(editableText) }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
