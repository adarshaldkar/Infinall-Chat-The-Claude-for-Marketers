"use client";

import React, { useState, useMemo } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Copy, Check, Download, Grid, Code, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SvgViewerProps {
  content: string;
  isStreaming?: boolean;
}

export default function SvgViewer({ content, isStreaming }: SvgViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"preview" | "xml">("preview");

  // Extract clean SVG string (in case it is wrapped in markdown code blocks or has extra text)
  const cleanSvg = useMemo(() => {
    let svg = content.trim();
    if (svg.startsWith("```xml") || svg.startsWith("```svg") || svg.startsWith("```html")) {
      svg = svg.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "");
    } else if (svg.startsWith("```")) {
      svg = svg.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }
    return svg;
  }, [content]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.25));
  const handleResetZoom = () => setZoom(1);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanSvg);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownload = () => {
    const blob = new Blob([cleanSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "graphic.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full w-full bg-neutral-950 text-neutral-100 overflow-hidden select-none">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 bg-neutral-900/60 backdrop-blur text-xs">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode("preview")}
            className={`h-7 px-2.5 text-xs font-medium rounded-md ${
              mode === "preview"
                ? "bg-neutral-800 text-neutral-100"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            Preview
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode("xml")}
            className={`h-7 px-2.5 text-xs font-medium rounded-md ${
              mode === "xml"
                ? "bg-neutral-800 text-neutral-100"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Code className="w-3.5 h-3.5 mr-1.5" />
            SVG Code
          </Button>
        </div>

        {mode === "preview" && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="h-7 w-7 p-0 text-neutral-400 hover:text-neutral-200"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="w-12 text-center text-[11px] font-mono text-neutral-400">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="h-7 w-7 p-0 text-neutral-400 hover:text-neutral-200"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetZoom}
              className="h-7 w-7 p-0 text-neutral-400 hover:text-neutral-200"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <div className="w-px h-4 bg-neutral-800 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGrid(!showGrid)}
              className={`h-7 px-2 text-xs rounded-md ${
                showGrid
                  ? "bg-neutral-800/80 text-neutral-200"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
              title="Toggle Transparency Grid"
            >
              <Grid className="w-3.5 h-3.5 mr-1" />
              Grid
            </Button>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2.5 text-xs text-neutral-300 hover:text-neutral-100 rounded-md"
            title="Copy SVG"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1" />
                Copy
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-7 px-2.5 text-xs text-neutral-300 hover:text-neutral-100 rounded-md"
            title="Download SVG file"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Export SVG
          </Button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      {mode === "preview" ? (
        <div
          className={`relative flex-1 overflow-auto flex items-center justify-center p-8 ${
            showGrid
              ? "bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:16px_16px] bg-neutral-950"
              : "bg-neutral-950"
          }`}
        >
          {isStreaming && (
            <div className="absolute top-3 left-4 z-10 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] animate-pulse">
              Streaming SVG...
            </div>
          )}

          <div
            className="transition-transform duration-150 ease-out max-w-full max-h-full flex items-center justify-center"
            style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
            dangerouslySetInnerHTML={{ __html: cleanSvg }}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4 bg-neutral-950 font-mono text-xs text-neutral-300 leading-relaxed select-text">
          <pre className="whitespace-pre-wrap break-words">{cleanSvg}</pre>
        </div>
      )}
    </div>
  );
}
