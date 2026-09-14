"use client";

import { useEffect, useRef } from "react";
import { Message } from "@/components/workspace/SplitWorkspace";
import UserMessage from "@/components/chat/UserMessage";
import AssistantMessage from "@/components/chat/AssistantMessage";
import EmptyState from "@/components/chat/EmptyState";
import Composer from "@/components/chat/Composer";
import { PanelLeft, Sparkles } from "lucide-react";
import { UploadedAttachment } from "@/lib/multimodal/types";

interface ChatWorkspaceProps {
  messages: Message[];
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
}

export default function ChatWorkspace({
  messages,
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
}: ChatWorkspaceProps) {
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
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Autonomous Marketer</span>
        </div>
      </div>

      {/* Message feed */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState onSendMessage={onSendMessage} />
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
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
