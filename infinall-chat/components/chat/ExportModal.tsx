"use client";

import { useState } from "react";
import {
  FileText,
  Presentation,
  FileCode,
  Download,
  Loader2,
  Check,
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  type?: string;
}

const EXPORT_OPTIONS = [
  {
    id: "pdf",
    label: "PDF Document (.pdf)",
    description: "Styled executive report formatted for distribution and presentation.",
    icon: FileText,
    badge: "Executive Brief",
    color: "text-red-400 bg-red-500/10 border-red-500/20",
  },
  {
    id: "docx",
    label: "Microsoft Word (.docx)",
    description: "Fully styled Word document with editable headings, tables, and sections.",
    icon: FileText,
    badge: "Editable Doc",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  {
    id: "pptx",
    label: "PowerPoint Presentation (.pptx)",
    description: "Auto-structured slide deck organized into key takeaways and bullet slides.",
    icon: Presentation,
    badge: "Slide Deck",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "html",
    label: "Standalone Web Page (.html)",
    description: "Responsive dark-mode HTML document viewable in any browser offline.",
    icon: FileCode,
    badge: "Offline Web",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: "md",
    label: "Raw Markdown (.md)",
    description: "Clean GitHub-flavored Markdown text file for Notion, GitHub, or Obsidian.",
    icon: FileText,
    badge: "Clean Markdown",
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  },
];

export default function ExportModal({
  isOpen,
  onClose,
  title,
  content,
}: ExportModalProps) {
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const [completedFormat, setCompletedFormat] = useState<string | null>(null);

  const handleExport = async (format: string) => {
    try {
      setExportingFormat(format);
      const res = await fetch(`/api/artifacts/export/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Infinall_Strategy_Deliverable",
          content,
          type: "markdown",
        }),
      });

      if (!res.ok) {
        throw new Error(`Export failed: ${res.statusText}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(title || "infinall_deliverable").replace(/[^a-zA-Z0-9_-]/g, "_")}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setCompletedFormat(format);
      setTimeout(() => {
        setCompletedFormat(null);
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Export error:", err);
      alert(`Export failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl bg-zinc-950 border border-zinc-800 text-zinc-100 p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-5 pb-3 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-zinc-100">
                  Export Deliverable
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                  Select your preferred format to compile and download this strategic asset.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {EXPORT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isCurrentExporting = exportingFormat === opt.id;
            const isCurrentCompleted = completedFormat === opt.id;

            return (
              <button
                key={opt.id}
                onClick={() => handleExport(opt.id)}
                disabled={!!exportingFormat}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-700 disabled:opacity-50 transition-all text-left group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`p-2.5 rounded-lg border shrink-0 ${opt.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-200 group-hover:text-white truncate">
                        {opt.label}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/60 shrink-0">
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed truncate">
                      {opt.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 ml-3">
                  {isCurrentExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  ) : isCurrentCompleted ? (
                    <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                      <Check className="w-4 h-4" />
                      <span>Ready</span>
                    </div>
                  ) : (
                    <Download className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-zinc-800/80 bg-zinc-900/30 flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Zero quality loss binary compilation
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg border border-zinc-700/60 hover:bg-zinc-800 text-zinc-300 transition-colors"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
