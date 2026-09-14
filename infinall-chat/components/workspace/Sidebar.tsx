"use client";

import { Plus, MessageSquare, ChevronLeft, Sparkles, BarChart2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatSession } from "@/lib/state/session-store";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
}

export default function Sidebar({
  isOpen,
  onToggle,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex flex-col h-full transition-all duration-300 ease-in-out border-r shrink-0 z-30",
        isOpen ? "w-64" : "w-0 overflow-hidden border-none"
      )}
      style={{
        background: "var(--color-sidebar)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm"
            style={{ background: "var(--color-accent)" }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
            Infinall
          </span>
        </div>
        <button
          onClick={onToggle}
          title="Collapse sidebar"
          className="p-1.5 rounded-md hover:bg-zinc-800 transition-colors"
          style={{ color: "var(--color-text-muted)" }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 py-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
          style={{ color: "var(--color-text)", background: "var(--color-card)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-border)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-card)")}
        >
          <Plus className="w-4 h-4 text-amber-400" />
          New Chat
        </button>
      </div>

      {/* Quick Actions */}
      <div className="px-3 pb-2">
        <div className="space-y-0.5">
          {[
            { icon: MessageSquare, label: "Projects" },
            { icon: BarChart2, label: "Analytics" },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-zinc-800/60"
              style={{ color: "var(--color-text-muted)" }}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 my-1 h-px" style={{ background: "var(--color-border)" }} />

      {/* Dynamic Recents List */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider px-2 mb-2" style={{ color: "var(--color-muted)" }}>
          Recent Chats
        </p>

        {sessions.length === 0 ? (
          <p className="text-xs px-2 py-3 text-zinc-500 italic">No conversations yet</p>
        ) : (
          <div className="space-y-1">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <div
                  key={session.id}
                  className={cn(
                    "group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors cursor-pointer",
                    isActive ? "bg-zinc-800 text-zinc-100 font-medium" : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
                  )}
                  onClick={() => onSelectSession(session.id)}
                >
                  <span className="truncate flex-1 pr-1">{session.title || "Untitled Conversation"}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    title="Delete chat"
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 rounded transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Profile */}
      <div
        className="p-3 border-t mt-auto flex items-center gap-2"
        style={{ borderColor: "var(--color-border)", background: "var(--color-sidebar)" }}
      >
        <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-200">
          M
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: "var(--color-text)" }}>
            Marketer
          </p>
          <p className="text-[10px] truncate" style={{ color: "var(--color-muted)" }}>
            Pro Plan
          </p>
        </div>
      </div>
    </aside>
  );
}
