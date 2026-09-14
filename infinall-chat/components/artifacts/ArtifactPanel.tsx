"use client";

import { useState, useEffect } from "react";
import { X, Copy, Check, Code2, Eye, History, Sparkles } from "lucide-react";
import { Artifact } from "@/components/workspace/SplitWorkspace";
import { ArtifactType } from "@/lib/artifacts/types";
import { ArtifactVersionStore } from "@/lib/artifacts/version-store";
import ArtifactRendererRegistry from "./ArtifactRendererRegistry";
import ExportMenuDropdown from "./controls/ExportMenuDropdown";
import VersionHistoryModal from "./controls/VersionHistoryModal";

interface ArtifactPanelProps {
  artifact: Artifact;
  onClose: () => void;
  onUpdateArtifact?: (updated: Partial<Artifact>) => void;
}

export default function ArtifactPanel({
  artifact,
  onClose,
  onUpdateArtifact,
}: ArtifactPanelProps) {
  const [view, setView] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);

  // Commit snapshot to version store when artifact completes streaming
  useEffect(() => {
    if (!artifact.isStreaming && artifact.content) {
      ArtifactVersionStore.commit(artifact.id, artifact.content, `Revision ${artifact.version}`);
    }
  }, [artifact.isStreaming, artifact.id, artifact.content, artifact.version]);

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRestoreVersion = (version: number, content: string) => {
    if (onUpdateArtifact) {
      onUpdateArtifact({ content, version });
    }
  };

  const handleContentEdit = (newContent: string) => {
    if (onUpdateArtifact) {
      onUpdateArtifact({ content: newContent });
    }
  };

  return (
    <div
      className="flex flex-col h-full border-l overflow-hidden select-text"
      style={{ background: "var(--color-canvas)", borderColor: "var(--color-border)" }}
    >
      {/* Top Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0 gap-3"
        style={{ borderColor: "var(--color-border)", background: "var(--color-sidebar)" }}
      >
        {/* Title & Metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold truncate text-zinc-100" title={artifact.title}>
              {artifact.title}
            </h2>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono tracking-wider border shrink-0"
              style={{
                background: "rgba(34,211,238,0.1)",
                borderColor: "rgba(34,211,238,0.25)",
                color: "#22d3ee",
              }}
            >
              {artifact.type}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
            {artifact.isStreaming ? (
              <span className="flex items-center gap-1.5 text-cyan-400 animate-pulse font-medium text-[11px]">
                <Sparkles className="w-3 h-3" />
                Generating deliverable...
              </span>
            ) : (
              <button
                onClick={() => setIsVersionModalOpen(true)}
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-cyan-400 font-mono transition-colors"
                title="View version history and diffs"
              >
                <History className="w-3 h-3" />
                <span>v{artifact.version}</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Export Dropdown */}
          {!artifact.isStreaming && artifact.content && (
            <ExportMenuDropdown
              artifactId={artifact.id}
              title={artifact.title}
              type={artifact.type as ArtifactType}
              content={artifact.content}
            />
          )}

          {/* View Mode Toggle (Preview vs Code) */}
          <div
            className="flex items-center rounded-lg p-0.5 border"
            style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
          >
            <button
              onClick={() => setView("preview")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === "preview"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
            <button
              onClick={() => setView("code")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === "code"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Code
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            title="Copy artifact content"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Close Panel Button */}
          <button
            onClick={onClose}
            title="Close artifact workspace"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Artifact Rendered Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {!artifact.content ? (
          <ArtifactSkeleton isStreaming={artifact.isStreaming} title={artifact.title} />
        ) : (
          <ArtifactRendererRegistry
            id={artifact.id}
            type={artifact.type}
            language={artifact.language}
            content={artifact.content}
            viewMode={view}
            isStreaming={artifact.isStreaming}
            onContentChange={handleContentEdit}
          />
        )}
      </div>

      {/* Version History & Diff Modal */}
      <VersionHistoryModal
        artifactId={artifact.id}
        currentContent={artifact.content}
        currentVersion={artifact.version}
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        onRestoreVersion={handleRestoreVersion}
      />
    </div>
  );
}

function ArtifactSkeleton({ isStreaming, title }: { isStreaming?: boolean; title?: string }) {
  return (
    <div className="p-8 space-y-4 max-w-2xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
        <span className="text-xs font-mono text-zinc-400">
          {isStreaming ? `Generating "${title ?? "deliverable"}"...` : "Preparing deliverable workspace..."}
        </span>
      </div>
      <div className="skeleton-shimmer h-7 rounded-lg w-2/3" />
      <div className="skeleton-shimmer h-4 rounded-lg w-full" />
      <div className="skeleton-shimmer h-4 rounded-lg w-5/6" />
      <div className="skeleton-shimmer h-4 rounded-lg w-4/5" />
      <div className="h-6" />
      <div className="skeleton-shimmer h-48 rounded-xl w-full" />
      <div className="skeleton-shimmer h-4 rounded-lg w-full" />
      <div className="skeleton-shimmer h-4 rounded-lg w-3/4" />
    </div>
  );
}
