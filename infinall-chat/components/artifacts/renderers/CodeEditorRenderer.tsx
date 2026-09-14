"use client";

import { useState } from "react";
import { Copy, Check, Code2 } from "lucide-react";

interface CodeEditorRendererProps {
  content: string;
  language?: string;
}

export default function CodeEditorRenderer({ content, language = "plaintext" }: CodeEditorRendererProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = content.split("\n");

  return (
    <div className="flex flex-col h-full bg-zinc-950 font-mono text-xs overflow-hidden">
      {/* Code Header */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b text-xs shrink-0"
        style={{ borderColor: "var(--color-border)", background: "rgba(0,0,0,0.3)" }}
      >
        <div className="flex items-center gap-2 text-zinc-400">
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="uppercase text-[11px] font-semibold text-zinc-300">{language}</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-500 text-[11px]">{lines.length} lines</span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy Code"}
        </button>
      </div>

      {/* Code Area */}
      <div className="flex-1 overflow-auto p-4 flex">
        {/* Line Numbers */}
        <div className="select-none pr-4 text-right text-zinc-600 font-mono text-[11px] border-r border-zinc-800/80 mr-4">
          {lines.map((_, i) => (
            <div key={i} className="leading-5">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code Lines */}
        <pre className="flex-1 text-zinc-200 leading-5 overflow-x-auto whitespace-pre">
          <code>{content}</code>
        </pre>
      </div>
    </div>
  );
}
