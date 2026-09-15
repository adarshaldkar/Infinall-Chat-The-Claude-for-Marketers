"use client";

import { useEffect, useRef, useState } from "react";
import { Message } from "@/components/workspace/SplitWorkspace";
import UserMessage from "@/components/chat/UserMessage";
import AssistantMessage from "@/components/chat/AssistantMessage";
import EmptyState from "@/components/chat/EmptyState";
import Composer from "@/components/chat/Composer";
import ExportModal from "@/components/chat/ExportModal";
import InlineVideoPlayer from "@/components/multimodal/InlineVideoPlayer";
import { PanelLeft, Sparkles, Download } from "lucide-react";
import { UploadedAttachment, VideoScene, TimestampCitation } from "@/lib/multimodal/types";
import { WorkspaceProject } from "@/lib/state/session-store";

interface ChatWorkspaceProps {
  messages: Message[];
  activeSessionId: string | null;
  projects?: WorkspaceProject[];
  activeProjectId?: string | null;
  onProjectChange?: (id: string | null) => void;
  isGenerating: boolean;
  statusMessage: string;
  onSendMessage: (content: string, modelId: string, options?: { isDeepResearch?: boolean; attachments?: UploadedAttachment[] }) => void;
  onStop: () => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  sessionTitle?: string;
  onRegenerate?: (messageId: string) => void;
  onSwitchVariant?: (messageId: string, variantIndex: number) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  activeVideo?: { url: string; title: string; scenes?: VideoScene[]; citations?: TimestampCitation[] } | null;
}

export default function ChatWorkspace({
  messages,
  activeSessionId,
  projects = [],
  activeProjectId = null,
  onProjectChange,
  isGenerating,
  statusMessage,
  onSendMessage,
  onStop,
  sidebarOpen,
  onToggleSidebar,
  sessionTitle,
  onRegenerate,
  onSwitchVariant,
  onEditMessage,
  activeVideo = null,
}: ChatWorkspaceProps) {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrolled = useRef(false);

  // Smart auto-scroll: pin to bottom unless user scrolled up
  useEffect(() => {
    const container = containerRef.current;
    if (!container || isUserScrolled.current) return;
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      isUserScrolled.current = distanceFromBottom > 80;
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--color-bg)" }}>
      {/* Workspace Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b shrink-0 z-10"
        style={{ borderColor: "var(--color-border)", background: "rgba(9, 9, 11, 0.75)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-3">
          {!sidebarOpen && onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              title="Open Sidebar"
              className="p-1.5 rounded-lg border border-zinc-700/60 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors shadow-sm"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-200 truncate max-w-xs md:max-w-md">
              {sessionTitle || "Infinall Strategy Workspace"}
            </span>
          </div>
          {projects.length > 0 && (
            <select
              value={activeProjectId ?? ""}
              onChange={(event) => onProjectChange?.(event.target.value || null)}
              className="max-w-52 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 outline-none"
              aria-label="Active project"
            >
              <option value="">No project</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          )}
        </div>

        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-700/80 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-cyan-400 text-xs font-medium transition-all shadow-sm"
              title="Export complete session (PDF, Word, PPTX, HTML, Markdown)"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export Chat</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Autonomous Marketer</span>
          </div>
        </div>
      </div>

      {/* Full Session Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title={sessionTitle || "Infinall_Strategy_Session"}
        content={(() => {
          let md = `# ${sessionTitle || "Infinall Chat Strategy Session"}\n\n`;
          md += `*Exported from Infinall Chat on ${new Date().toLocaleString()}*\n\n---\n\n`;
          messages.forEach((msg, idx) => {
            const roleLabel = msg.role === "user" ? "User" : "Infinall (Autonomous Marketer)";
            md += `### ${idx + 1}. ${roleLabel}\n\n`;
            if (msg.thinking) {
              md += `> **Reasoning Trace:**\n> ${msg.thinking.replace(/\n/g, "\n> ")}\n\n`;
            }
            md += `${msg.content}\n\n`;
            if (msg.toolCalls && msg.toolCalls.length > 0) {
              md += `*Tools Executed:* ${msg.toolCalls.map((t) => t.toolName).join(", ")}\n\n`;
            }
            md += `---\n\n`;
          });
          return md;
        })()}
      />

      {/* Message feed */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState onSendMessage={onSendMessage} />
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {activeVideo && (
              <div className="mb-6">
                <InlineVideoPlayer
                  src={activeVideo.url}
                  title={activeVideo.title}
                  scenes={activeVideo.scenes}
                  citations={activeVideo.citations}
                />
              </div>
            )}
            {messages.map((msg) =>
              msg.role === "user" ? (
                <UserMessage
                  key={msg.id}
                  message={msg}
                  onEditMessage={onEditMessage}
                  isGenerating={isGenerating}
                />
              ) : (
                <AssistantMessage
                  key={msg.id}
                  message={msg}
                  activeSessionId={activeSessionId}
                  isGenerating={isGenerating}
                  statusMessage={statusMessage}
                  onRegenerate={onRegenerate}
                  onSwitchVariant={onSwitchVariant}
                />
              )
            )}
            <div ref={bottomRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 p-4 max-w-3xl w-full mx-auto">
        <Composer
          isGenerating={isGenerating}
          onSend={onSendMessage}
          onStop={onStop}
        />
      </div>
    </div>
  );
}
