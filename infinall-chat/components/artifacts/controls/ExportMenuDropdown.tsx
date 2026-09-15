"use client";

import { useState, useRef, useEffect } from "react";
import {
  Download,
  FileText,
  FileSpreadsheet,
  Presentation,
  FileCode,
  File,
  Loader2,
  ChevronDown,
  Cloud,
  ShieldCheck,
  Check,
} from "lucide-react";
import { ArtifactType } from "@/lib/artifacts/types";

interface ExportMenuDropdownProps {
  artifactId: string;
  title: string;
  type: ArtifactType;
  content: string;
}

export default function ExportMenuDropdown({
  artifactId,
  title,
  type,
  content,
}: ExportMenuDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [driveSynced, setDriveSynced] = useState(false);
  const [isSendingApproval, setIsSendingApproval] = useState(false);
  const [approvalSent, setApprovalSent] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExportGoogleDrive = async () => {
    try {
      setIsSyncingDrive(true);
      const res = await fetch("/api/artifacts/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "google_drive", artifactId, title, type, content }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Google Drive handoff failed");
      setDriveSynced(true);
      setTimeout(() => {
        setDriveSynced(false);
        setIsOpen(false);
      }, 2000);
    } catch (err) {
      console.error("Google Drive sync error:", err);
      window.alert(err instanceof Error ? err.message : "Google Drive handoff failed");
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleSendApprovalCenter = async () => {
    try {
      setIsSendingApproval(true);
      const res = await fetch("/api/artifacts/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approval_center", artifactId, title, type, content }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Approval Center handoff failed");
      setApprovalSent(true);
      setTimeout(() => {
        setApprovalSent(false);
        setIsOpen(false);
      }, 2000);
    } catch (err) {
      console.error("Approval routing error:", err);
      window.alert(err instanceof Error ? err.message : "Approval Center handoff failed");
    } finally {
      setIsSendingApproval(false);
    }
  };

  const handleExport = async (format: "docx" | "xlsx" | "pptx" | "pdf" | "md" | "html") => {
    try {
      setExportingFormat(format);
      const res = await fetch(`/api/artifacts/export/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifactId,
          title,
          type,
          content,
        }),
      });

      if (!res.ok) {
        throw new Error(`Export failed: ${res.statusText}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setIsOpen(false);
    } catch (err) {
      console.error("Export error:", err);
      alert(`Export failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={!!exportingFormat}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-sm"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-card)",
          color: "var(--color-text)",
        }}
      >
        {exportingFormat ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
        ) : (
          <Download className="w-3.5 h-3.5 text-cyan-400" />
        )}
        <span>{exportingFormat ? `Exporting ${exportingFormat.toUpperCase()}...` : "Export Deliverable"}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-xl border p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100"
          style={{
            borderColor: "var(--color-border)",
            background: "#09090b",
          }}
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Export Binary Documents
          </div>

          <button
            onClick={() => handleExport("docx")}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-left text-zinc-200 hover:bg-zinc-800/80 transition-colors group"
          >
            <FileText className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            <div className="flex-1">
              <div className="font-medium">Microsoft Word (.docx)</div>
              <div className="text-[10px] text-zinc-400">Strategy brief & memo</div>
            </div>
          </button>

          <button
            onClick={() => handleExport("xlsx")}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-left text-zinc-200 hover:bg-zinc-800/80 transition-colors group"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <div className="flex-1">
              <div className="font-medium">Excel Spreadsheet (.xlsx)</div>
              <div className="text-[10px] text-zinc-400">Multi-tab media plan & formulas</div>
            </div>
          </button>

          <button
            onClick={() => handleExport("pptx")}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-left text-zinc-200 hover:bg-zinc-800/80 transition-colors group"
          >
            <Presentation className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <div className="flex-1">
              <div className="font-medium">PowerPoint Deck (.pptx)</div>
              <div className="text-[10px] text-zinc-400">16:9 Widescreen slide deck</div>
            </div>
          </button>

          <button
            onClick={() => handleExport("pdf")}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-left text-zinc-200 hover:bg-zinc-800/80 transition-colors group"
          >
            <File className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
            <div className="flex-1">
              <div className="font-medium">Print Document (.pdf)</div>
              <div className="text-[10px] text-zinc-400">Print-ready document</div>
            </div>
          </button>

          <div className="my-1 border-t border-zinc-800/80" />
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Raw Source Code
          </div>

          <button
            onClick={() => handleExport("md")}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-left text-zinc-300 hover:bg-zinc-800/80 transition-colors"
          >
            <FileCode className="w-4 h-4 text-purple-400" />
            <span>Markdown (.md)</span>
          </button>

          <button
            onClick={() => handleExport("html")}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-left text-zinc-300 hover:bg-zinc-800/80 transition-colors"
          >
            <FileCode className="w-4 h-4 text-cyan-400" />
            <span>HTML Bundle (.html)</span>
          </button>

          <div className="my-1 border-t border-zinc-800/80" />
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Workspaces & Approvals
          </div>

          <button
            onClick={handleExportGoogleDrive}
            disabled={isSyncingDrive}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-left text-zinc-200 hover:bg-zinc-800/80 transition-colors group"
          >
            {isSyncingDrive ? (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            ) : driveSynced ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Cloud className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            )}
            <div className="flex-1">
              <div className="font-medium">
                {isSyncingDrive
                  ? "Syncing to Drive..."
                  : driveSynced
                  ? "Synced to Google Drive ✓"
                  : "Export to Google Drive"}
              </div>
              <div className="text-[10px] text-zinc-400">Save directly to team drive folder</div>
            </div>
          </button>

          <button
            onClick={handleSendApprovalCenter}
            disabled={isSendingApproval}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-left text-zinc-200 hover:bg-zinc-800/80 transition-colors group"
          >
            {isSendingApproval ? (
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
            ) : approvalSent ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            )}
            <div className="flex-1">
              <div className="font-medium">
                {isSendingApproval
                  ? "Routing for Approval..."
                  : approvalSent
                  ? "Enqueued in Approval Center ✓"
                  : "Send to Approval Center"}
              </div>
              <div className="text-[10px] text-zinc-400">Require CMO/Lead sign-off before deploy</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
