"use client";

import React, { useState, useRef, useEffect } from "react";
import { ExternalLink, Globe } from "lucide-react";

interface CitationBadgeProps {
  index: number;
  url?: string;
  title?: string;
  domain?: string;
  snippet?: string;
}

export default function CitationBadge({
  index,
  url,
  title,
  domain,
  snippet,
}: CitationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayDomain = domain || (url ? new URL(url).hostname.replace(/^www\./, "") : "web");
  const displayTitle = title || `Source [${index}]`;

  return (
    <span className="relative inline-block align-baseline" ref={cardRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center justify-center px-1.5 py-0.2 mx-0.5 rounded text-[10px] font-mono font-medium transition-all bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:scale-105 border border-amber-500/30"
        title={`View source [${index}]: ${displayTitle}`}
      >
        [{index}]
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 rounded-xl border border-zinc-700 bg-zinc-950/95 shadow-2xl backdrop-blur-xl text-left z-50 animate-in fade-in zoom-in-95 duration-150 select-text">
          <div className="flex items-start justify-between gap-2 pb-1.5 border-b border-zinc-800">
            <div className="flex items-center gap-1.5 min-w-0">
              <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-[11px] font-mono text-zinc-400 truncate">{displayDomain}</span>
            </div>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-cyan-300 transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <p className="text-xs font-medium text-white mt-2 line-clamp-2 leading-snug">
            {displayTitle}
          </p>

          {snippet && (
            <p className="text-[11px] text-zinc-400 mt-1.5 line-clamp-3 leading-relaxed bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/60 font-sans">
              &ldquo;{snippet}&rdquo;
            </p>
          )}

          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[11px] text-cyan-400 font-medium transition-colors"
            >
              <span>Visit Verified Source</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </span>
  );
}
