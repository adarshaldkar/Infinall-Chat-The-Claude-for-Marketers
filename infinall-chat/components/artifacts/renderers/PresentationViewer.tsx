"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Presentation,
  FileDown,
  Rows3,
  MonitorSmartphone,
} from "lucide-react";
import { PresentationPayload, PresentationSlidePayload } from "@/lib/artifacts/types";
import { Button } from "@/components/ui/button";

interface PresentationViewerProps {
  content: string;
  isStreaming?: boolean;
}

function parseSlides(content: string): PresentationSlidePayload[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as PresentationPayload;
    if (Array.isArray(parsed.slides) && parsed.slides.length > 0) {
      return parsed.slides;
    }
  } catch {
    // fall through to markdown parsing
  }

  // Fallback: parse markdown headings (# / ##) into slide decks.
  const slides: PresentationSlidePayload[] = [];
  let current: PresentationSlidePayload | null = null;

  for (const rawLine of trimmed.split(/\r?\n/)) {
    const line = rawLine.trim();
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      if (current) slides.push(current);
      current = {
        layout: "title",
        title: heading[2].replace(/\*\*/g, ""),
      };
      continue;
    }

    if (current && line.startsWith("- ")) {
      const text = line.slice(2);
      if (/^[A-Za-z0-9$%.,]+$/.test(text) && /[$%]/.test(text)) {
        current.statCards = current.statCards || [];
        current.statCards.push({ label: text, value: text });
      } else {
        current.bulletPoints = current.bulletPoints || [];
        current.bulletPoints.push(text);
      }
      continue;
    }

    if (line && !current) {
      current = { layout: "content", title: "Slide", bulletPoints: [line] };
    }
  }
  if (current) slides.push(current);
  return slides;
}

export default function PresentationViewer({ content, isStreaming }: PresentationViewerProps) {
  const slides = useMemo(() => parseSlides(content), [content]);
  const [index, setIndex] = useState(0);

  if (slides.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 bg-neutral-950 text-neutral-400 text-sm select-none">
        <Presentation className="w-10 h-10 text-neutral-700" />
        <span>No slides to preview.</span>
        {isStreaming && <span className="text-xs text-amber-400 animate-pulse">Composing deck…</span>}
      </div>
    );
  }

  const current = slides[Math.min(index, slides.length - 1)] ?? slides[0];

  const renderSlide = (slide: PresentationSlidePayload) => {
    switch (slide.layout) {
      case "stats":
        return (
          <div className="grid grid-cols-2 gap-3 w-full max-w-md">
            {(slide.statCards ?? []).map((stat, i) => (
              <div
                key={i}
                className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 text-center"
              >
                <div className="text-xl font-bold text-emerald-400">{stat.value}</div>
                <div className="text-[10px] text-neutral-400 mt-0.5">
                  {stat.label}
                  {stat.subtext ? ` · ${stat.subtext}` : ""}
                </div>
              </div>
            ))}
          </div>
        );
      case "table":
        return slide.tableData ? (
          <table className="w-full max-w-md text-xs border-collapse">
            <thead>
              <tr>
                {slide.tableData.headers.map((h) => (
                  <th
                    key={h}
                    className="border border-neutral-800 bg-neutral-900 px-2 py-1 text-left text-neutral-300 font-semibold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slide.tableData.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className="border border-neutral-800 px-2 py-1 text-neutral-400">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <span className="text-neutral-500 text-xs">No table data</span>
        );
      case "timeline":
        return (
          <ol className="w-full max-w-md space-y-2 text-xs">
            {(slide.bulletPoints ?? []).map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-neutral-300">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                {point}
              </li>
            ))}
          </ol>
        );
      case "split":
        return (
          <div className="w-full max-w-lg text-xs space-y-2">
            <h4 className="text-sm font-semibold text-neutral-200">{slide.title}</h4>
            {slide.subtitle && <p className="text-neutral-400">{slide.subtitle}</p>}
            <div className="flex gap-3">
              <div className="flex-1 rounded-lg border border-neutral-800 p-2">
                {(slide.bulletPoints ?? []).map((b, i) => (
                  <div key={i} className="py-0.5 text-neutral-400">
                    · {b}
                  </div>
                ))}
              </div>
              {slide.statCards && (
                <div className="flex-1 rounded-lg border border-neutral-800 p-2">
                  {slide.statCards.map((s, i) => (
                    <div key={i} className="py-0.5 text-emerald-400 font-semibold">
                      {s.value} <span className="text-neutral-500 font-normal">— {s.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      case "content":
      default:
        return (
          <div className="w-full max-w-lg text-xs space-y-3">
            <h4 className="text-base font-semibold text-neutral-100">{slide.title}</h4>
            {slide.subtitle && <p className="text-neutral-400">{slide.subtitle}</p>}
            <ul className="space-y-1.5">
              {(slide.bulletPoints ?? []).map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-neutral-300">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-neutral-950 text-neutral-100 overflow-hidden select-none">
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 bg-neutral-900/60 backdrop-blur text-xs">
        <div className="flex items-center gap-2">
          <Presentation className="w-4 h-4 text-emerald-400" />
          <span className="font-medium text-neutral-200">Slide Deck Preview</span>
          <span className="text-[10px] font-mono text-neutral-500">
            {slides.length} slide{slides.length === 1 ? "" : "s"}
          </span>
          {isStreaming && (
            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-mono animate-pulse">
              Rendering…
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.open(`/api/artifacts/export/pptx`, "_blank")}
          className="h-7 px-2.5 text-xs text-neutral-300 hover:text-white"
          title="Export slide deck (binary is generated from the saved source)"
        >
          <FileDown className="w-3.5 h-3.5 mr-1" />
          Export PPTX
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:16px_16px]">
        <div className="w-full max-w-xl aspect-video rounded-xl border border-neutral-700/80 bg-neutral-900 shadow-2xl p-6 flex items-center justify-center">
          <div className="flex gap-10 items-center justify-between w-full">
            <Button
              variant="ghost"
              size="sm"
              disabled={index === 0}
              onClick={() => setIndex(Math.max(0, index - 1))}
              className="h-9 w-9 p-0 text-neutral-400 hover:text-white disabled:opacity-30"
              title="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <div className="flex-1 overflow-auto max-h-full">{renderSlide(current)}</div>

            <Button
              variant="ghost"
              size="sm"
              disabled={index >= slides.length - 1}
              onClick={() => setIndex(Math.min(slides.length - 1, index + 1))}
              className="h-9 w-9 p-0 text-neutral-400 hover:text-white disabled:opacity-30"
              title="Next slide"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-2 border-t border-neutral-800 bg-neutral-900/80 flex items-center justify-between text-xs">
        <span className="font-mono text-neutral-500">
          {index + 1} / {slides.length}
        </span>
        <div className="flex items-center gap-1.5">
          <Rows3 className="w-3.5 h-3.5 text-neutral-500" />
          <span className="text-neutral-400 font-mono">{current.layout}</span>
        </div>
        <span className="text-neutral-600 flex items-center gap-1">
          <MonitorSmartphone className="w-3.5 h-3.5" />
          16:9
        </span>
      </div>
    </div>
  );
}