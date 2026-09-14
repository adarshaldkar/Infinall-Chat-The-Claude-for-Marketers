"use client";

import { useEffect, useRef } from "react";
import { Message } from "@/components/workspace/SplitWorkspace";
import UserMessage from "@/components/chat/UserMessage";
import AssistantMessage from "@/components/chat/AssistantMessage";
import EmptyState from "@/components/chat/EmptyState";
import Composer from "@/components/chat/Composer";
import { PanelLeft, Sparkles } from "lucide-react";

interface ChatWorkspaceProps {
  messages: Message[];
  isGenerating: boolean;
  statusMessage: string;
  onSendMessage: (content: string, modelId: string, options?: { isDeepResearch?: boolean; attachments?: any[] }) => void;
  onStop: () => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  sessionTitle?: string;
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
    const onScroll = () => {
      const atBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 80;
      isUserScrolled.current = !atBottom;
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--color-canvas)" }}
    >
      {/* Top Header Bar with Sidebar Toggle Button */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0 z-10"
        style={{ borderColor: "var(--color-border)", background: "var(--color-sidebar)" }}
      >
        <div className="flex items-center gap-2.5">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
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
                <UserMessage key={msg.id} message={msg} />
              ) : (
                <AssistantMessage
                  key={msg.id}
                  message={msg}
                  isGenerating={isGenerating}
                  statusMessage={statusMessage}
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
