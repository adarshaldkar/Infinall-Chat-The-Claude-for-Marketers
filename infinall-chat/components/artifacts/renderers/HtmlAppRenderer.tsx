"use client";

import { useState, useMemo } from "react";
import { Monitor, Tablet, Smartphone, RotateCcw } from "lucide-react";

interface HtmlAppRendererProps {
  content: string;
  isStreaming?: boolean;
}

export default function HtmlAppRenderer({ content, isStreaming }: HtmlAppRendererProps) {
  const [deviceMode, setDeviceMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [iframeKey, setIframeKey] = useState(0);

  // Wrap raw HTML/JS in an isolated, styled sandbox template with Tailwind & Lucide icons
  const srcDoc = useMemo(() => {
    let cleanCode = content.trim();

    // If wrapped in html tags or markdown fences, extract
    if (cleanCode.includes("```html")) {
      cleanCode = cleanCode.replace(/^```html\s*/i, "").replace(/```\s*$/i, "");
    }

    const hasDoctype = cleanCode.toLowerCase().includes("<!doctype html>") || cleanCode.toLowerCase().includes("<html");

    // Polyfill script to guarantee slider & calculation interactivity
    const helperScript = `
    <script>
      document.addEventListener('DOMContentLoaded', () => {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
          window.lucide.createIcons();
        }

        // Auto-wire range slider labels if id-val / id-value patterns exist
        const ranges = document.querySelectorAll('input[type="range"]');
        ranges.forEach(r => {
          r.addEventListener('input', () => {
            const valEl = document.getElementById(r.id + '-val') || document.getElementById(r.id + '-value') || document.querySelector('[data-val-for="' + r.id + '"]');
            if (valEl) {
              const prefix = valEl.textContent.trim().startsWith('$') ? '$' : '';
              const suffix = valEl.textContent.trim().endsWith('%') ? '%' : '';
              valEl.textContent = prefix + Number(r.value).toLocaleString() + suffix;
            }
          });
        });
      });
    </script>
    `;

    if (hasDoctype) {
      // Ensure Tailwind & Lucide are present
      let enhanced = cleanCode;
      if (!enhanced.includes("cdn.tailwindcss.com")) {
        enhanced = enhanced.replace("<head>", '<head>\n<script src="https://cdn.tailwindcss.com"></script>');
      }
      if (!enhanced.includes("unpkg.com/lucide")) {
        enhanced = enhanced.replace("</head>", '<script src="https://unpkg.com/lucide@latest"></script>\n</head>');
      }
      enhanced = enhanced.replace("</body>", `${helperScript}\n</body>`);
      return enhanced;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      margin: 0;
      padding: 0;
      background: #09090b;
      color: #f4f4f5;
    }
    h1, h2, h3, h4 {
      font-family: 'Outfit', sans-serif;
    }
    /* Custom sleek scrollbar */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: #09090b;
    }
    ::-webkit-scrollbar-thumb {
      background: #27272a;
      border-radius: 3px;
    }
  </style>
</head>
<body class="p-4 sm:p-6 antialiased">
  ${cleanCode}
  ${helperScript}
</body>
</html>`;
  }, [content]);

  // Width constraints based on device mode
  const widthClass =
    deviceMode === "mobile"
      ? "max-w-[375px] shadow-2xl rounded-2xl border my-4"
      : deviceMode === "tablet"
      ? "max-w-[768px] shadow-2xl rounded-xl border my-4"
      : "w-full h-full";

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Device Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b text-xs shrink-0"
        style={{ borderColor: "var(--color-border)", background: "rgba(0,0,0,0.3)" }}
      >
        <div className="flex items-center gap-1 bg-zinc-900/80 p-0.5 rounded-lg border border-zinc-800">
          <button
            onClick={() => setDeviceMode("desktop")}
            className={`p-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              deviceMode === "desktop"
                ? "bg-cyan-500/20 text-cyan-400 font-medium"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
            title="Desktop View (100%)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            onClick={() => setDeviceMode("tablet")}
            className={`p-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              deviceMode === "tablet"
                ? "bg-cyan-500/20 text-cyan-400 font-medium"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
            title="Tablet View (768px)"
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tablet</span>
          </button>
          <button
            onClick={() => setDeviceMode("mobile")}
            className={`p-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              deviceMode === "mobile"
                ? "bg-cyan-500/20 text-cyan-400 font-medium"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
            title="Mobile View (375px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isStreaming && (
            <span className="flex items-center gap-1.5 text-xs text-cyan-400 animate-pulse font-medium">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Live Rendering
            </span>
          )}
          <button
            onClick={() => setIframeKey((k) => k + 1)}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
            title="Reload Application"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 flex justify-center items-center overflow-auto bg-zinc-950/60 p-2">
        <iframe
          key={iframeKey}
          srcDoc={srcDoc}
          title="Artifact Preview"
          sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
          className={`${widthClass} h-full bg-zinc-950 transition-all duration-300 border-zinc-800`}
        />
      </div>
    </div>
  );
}
