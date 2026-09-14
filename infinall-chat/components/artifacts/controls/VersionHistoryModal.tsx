"use client";

import { useState, useEffect } from "react";
import { ArtifactSnapshot } from "@/lib/artifacts/types";
import { ArtifactVersionStore, DiffLine } from "@/lib/artifacts/version-store";
import { History, X, RotateCcw, Clock } from "lucide-react";

interface VersionHistoryModalProps {
  artifactId: string;
  currentContent: string;
  currentVersion: number;
  isOpen: boolean;
  onClose: () => void;
  onRestoreVersion: (version: number, content: string) => void;
}

export default function VersionHistoryModal({
  artifactId,
  currentContent,
  currentVersion,
  isOpen,
  onClose,
  onRestoreVersion,
}: VersionHistoryModalProps) {
  const [selectedVersion, setSelectedVersion] = useState<number>(currentVersion);
  const [snapshots, setSnapshots] = useState<ArtifactSnapshot[]>([]);

  // Load store snapshots after mount/open so impure reads don't run during render.
  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      const history = ArtifactVersionStore.getHistory(artifactId);
      setSnapshots(
        history.length > 0
          ? history
          : [{ version: 1, timestamp: Date.now(), content: currentContent, summary: "Initial Generation" }]
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, artifactId, currentContent]);

  if (!isOpen) return null;

  const activeSnapshot =
    snapshots.find((s) => s.version === selectedVersion) || snapshots[snapshots.length - 1];
  const previousSnapshot = snapshots.find((s) => s.version === selectedVersion - 1);

  const diff: DiffLine[] = activeSnapshot
    ? previousSnapshot
      ? ArtifactVersionStore.computeDiff(previousSnapshot.content, activeSnapshot.content)
      : activeSnapshot.content.split("\n").map((line, i) => ({
          type: "added" as const,
          content: line,
          lineNumberNew: i + 1,
        }))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-4xl h-[650px] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ borderColor: "var(--color-border)" }}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: "var(--color-border)", background: "rgba(0,0,0,0.4)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Artifact Version History & Diffs</h3>
              <p className="text-xs text-zinc-400">
                Inspect immutable snapshots, view line deltas, and rollback revisions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Version List Sidebar */}
          <div className="w-64 border-r border-zinc-800/80 p-3 space-y-1.5 overflow-y-auto bg-zinc-900/30 shrink-0">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500 px-3 py-1">
              Timeline Revisions ({snapshots.length})
            </div>
            {snapshots.map((snap) => {
              const isSelected = selectedVersion === snap.version;
              const isCurrent = currentVersion === snap.version;

              return (
                <button
                  key={snap.version}
                  onClick={() => setSelectedVersion(snap.version)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? "bg-cyan-500/10 border-cyan-500/30 text-zinc-100"
                      : "border-transparent hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold font-mono text-cyan-400">v{snap.version}</span>
                    {isCurrent && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800/60">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-medium truncate text-zinc-200">{snap.summary}</div>
                  <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-1">
                    <Clock className="w-3 h-3" />
                    {new Date(snap.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Diff Inspector Content */}
          <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
            <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800/80 text-xs bg-zinc-900/20">
              <div className="text-zinc-300 font-medium flex items-center gap-2">
                <span>Inspecting Version {selectedVersion}</span>
                {previousSnapshot && (
                  <span className="text-zinc-500 text-[11px]">(Compared to v{previousSnapshot.version})</span>
                )}
              </div>

              {selectedVersion !== currentVersion && activeSnapshot && (
                <button
                  onClick={() => {
                    onRestoreVersion(activeSnapshot.version, activeSnapshot.content);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 text-black font-semibold text-xs hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore v{selectedVersion}
                </button>
              )}
            </div>

            {/* Diff Lines View */}
            <div className="flex-1 overflow-auto p-4 font-mono text-xs">
              <table className="w-full text-left border-collapse">
                <tbody>
                  {diff.map((line, idx) => {
                    const isAdd = line.type === "added";
                    const isRemove = line.type === "removed";

                    return (
                      <tr
                        key={idx}
                        className={`${
                          isAdd
                            ? "bg-emerald-950/20 text-emerald-300"
                            : isRemove
                            ? "bg-rose-950/20 text-rose-300"
                            : "text-zinc-400"
                        }`}
                      >
                        <td className="w-10 px-2 py-0.5 text-right select-none text-zinc-600 text-[10px] border-r border-zinc-800/40">
                          {line.lineNumberOld || ""}
                        </td>
                        <td className="w-10 px-2 py-0.5 text-right select-none text-zinc-600 text-[10px] border-r border-zinc-800/40">
                          {line.lineNumberNew || ""}
                        </td>
                        <td className="w-6 text-center select-none font-bold">
                          {isAdd ? "+" : isRemove ? "-" : " "}
                        </td>
                        <td className="px-2 py-0.5 whitespace-pre font-mono leading-5">{line.content}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
