"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { GitGraph, Download, AlertCircle } from "lucide-react";

interface MermaidDiagramRendererProps {
  content: string;
}

export default function MermaidDiagramRenderer({ content }: MermaidDiagramRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgCode, setSvgCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      themeVariables: {
        darkMode: true,
        background: "#09090b",
        primaryColor: "#22d3ee",
        primaryTextColor: "#f4f4f5",
        primaryBorderColor: "#0891b2",
        lineColor: "#71717a",
        secondaryColor: "#1e293b",
        tertiaryColor: "#0f172a",
      },
    });

    let clean = content.trim();
    if (clean.startsWith("```mermaid")) {
      clean = clean.replace(/^```mermaid\s*/i, "").replace(/```\s*$/i, "");
    } else if (clean.startsWith("```")) {
      clean = clean.replace(/^```\w*\s*/i, "").replace(/```\s*$/i, "");
    }

    const renderId = `mermaid-svg-${Date.now()}`;

    mermaid
      .render(renderId, clean)
      .then((result) => {
        setSvgCode(result.svg);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Diagram rendering failed");
      });
  }, [content]);

  const handleDownloadSvg = () => {
    if (!svgCode) return;
    const blob = new Blob([svgCode], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "marketing_workflow_diagram.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Subheader */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b text-xs shrink-0"
        style={{ borderColor: "var(--color-border)", background: "rgba(0,0,0,0.3)" }}
      >
        <div className="flex items-center gap-2 text-zinc-300 font-medium">
          <GitGraph className="w-3.5 h-3.5 text-cyan-400" />
          <span>Workflow Diagram Canvas</span>
        </div>
        <button
          onClick={handleDownloadSvg}
          disabled={!svgCode}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export SVG
        </button>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-zinc-950/80">
        {error ? (
          <div className="flex flex-col items-center gap-2 text-rose-400 text-sm max-w-md text-center p-4 bg-rose-950/20 border border-rose-900/50 rounded-xl">
            <AlertCircle className="w-6 h-6" />
            <p className="font-semibold">Mermaid Syntax Parsing Error</p>
            <p className="text-xs text-rose-300 font-mono">{error}</p>
          </div>
        ) : svgCode ? (
          <div
            ref={containerRef}
            className="w-full flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svgCode }}
          />
        ) : (
          <div className="text-zinc-500 text-xs animate-pulse">Rendering diagram...</div>
        )}
      </div>
    </div>
  );
}
