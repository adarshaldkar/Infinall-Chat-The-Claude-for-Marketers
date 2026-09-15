"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  MessageSquare,
  ChevronLeft,
  Sparkles,
  BarChart2,
  Trash2,
  Search,
  Pin,
  PinOff,
  Edit2,
  Check,
  X,
  FileDown,
  Database,
  Brain,
} from "lucide-react";
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
  onRenameSession?: (id: string, newTitle: string) => void;
  onPinSession?: (id: string) => void;
  onOpenToolsDirectory?: () => void;
  onOpenKnowledgeBase?: () => void;
  onOpenBrandMemory?: () => void;
}

export default function Sidebar({
  isOpen,
  onToggle,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onPinSession,
  onOpenToolsDirectory,
  onOpenKnowledgeBase,
  onOpenBrandMemory,
}: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Filter sessions by search term across title and message content
  const filteredSessions = useMemo(() => {
    if (!searchTerm.trim()) return sessions;
    const term = searchTerm.toLowerCase();
    return sessions.filter((s) => {
      if (s.title.toLowerCase().includes(term)) return true;
      return s.messages.some((m) => m.content.toLowerCase().includes(term));
    });
  }, [sessions, searchTerm]);

  // Separate pinned vs recent
  const pinnedSessions = useMemo(
    () => filteredSessions.filter((s) => s.isPinned),
    [filteredSessions]
  );
  const recentSessions = useMemo(
    () => filteredSessions.filter((s) => !s.isPinned),
    [filteredSessions]
  );

  const startEditing = (s: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(s.id);
    setEditingTitle(s.title);
  };

  const saveEditing = (id: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (editingTitle.trim() && onRenameSession) {
      onRenameSession(id, editingTitle.trim());
    }
    setEditingSessionId(null);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(null);
  };

  const exportTranscript = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    let md = `# ${session.title}\n\n`;
    md += `*Exported from Infinall Chat on ${new Date().toLocaleString()}*\n\n---\n\n`;

    session.messages.forEach((msg, idx) => {
      const roleLabel = msg.role === "user" ? "User" : "Infinall (Assistant)";
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

    if (session.artifact) {
      md += `## Attached Deliverable: ${session.artifact.title} (${session.artifact.type})\n\n`;
      md += "```" + (session.artifact.language || session.artifact.type) + "\n";
      md += session.artifact.content + "\n";
      md += "```\n";
    }

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_transcript.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderSessionItem = (session: ChatSession) => {
    const isActive = session.id === activeSessionId;
    const isEditing = session.id === editingSessionId;

    return (
      <div
        key={session.id}
        className={cn(
          "group relative flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors cursor-pointer",
          isActive
            ? "bg-zinc-800 text-zinc-100 font-medium"
            : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
        )}
        onClick={() => onSelectSession(session.id)}
      >
        {isEditing ? (
          <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEditing(session.id, e);
                if (e.key === "Escape") setEditingSessionId(null);
              }}
              autoFocus
              className="flex-1 bg-zinc-900 border border-amber-500/50 rounded px-1.5 py-0.5 text-xs text-white outline-none"
            />
            <button
              onClick={(e) => saveEditing(session.id, e)}
              className="p-1 hover:text-emerald-400 text-zinc-300"
              title="Save"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={cancelEditing}
              className="p-1 hover:text-rose-400 text-zinc-300"
              title="Cancel"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <>
            <span className="truncate flex-1 pr-1.5">{session.title || "Untitled Conversation"}</span>

            {/* Actions on hover */}
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
              {/* Pin */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onPinSession) onPinSession(session.id);
                }}
                title={session.isPinned ? "Unpin chat" : "Pin chat to top"}
                className="p-1 rounded hover:bg-zinc-700/60 hover:text-amber-300 text-zinc-400"
              >
                {session.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
              </button>

              {/* Rename */}
              <button
                onClick={(e) => startEditing(session, e)}
                title="Rename chat"
                className="p-1 rounded hover:bg-zinc-700/60 hover:text-cyan-300 text-zinc-400"
              >
                <Edit2 className="w-3 h-3" />
              </button>

              {/* Export transcript */}
              <button
                onClick={(e) => exportTranscript(session, e)}
                title="Export chat transcript (Markdown)"
                className="p-1 rounded hover:bg-zinc-700/60 hover:text-purple-300 text-zinc-400"
              >
                <FileDown className="w-3 h-3" />
              </button>

              {/* Delete */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                }}
                title="Delete chat"
                className="p-1 rounded hover:bg-zinc-700/60 hover:text-red-400 text-zinc-400"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

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
      <div
        className="flex items-center justify-between px-4 py-4 border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
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

      {/* Search Input */}
      <div className="px-3 pb-2">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 bg-zinc-900/60 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-3 pb-2">
        <div className="space-y-0.5">
          <button
            onClick={onOpenToolsDirectory}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-zinc-800/60"
            style={{ color: "var(--color-text-muted)" }}
          >
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <span>Tools & Integrations</span>
          </button>
          <button
            onClick={onOpenKnowledgeBase}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-zinc-800/60"
            style={{ color: "var(--color-text-muted)" }}
          >
            <Database className="w-4 h-4 text-amber-400" />
            <span>Knowledge Base & VectorDB</span>
          </button>
          <button
            onClick={onOpenBrandMemory}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-zinc-800/60"
            style={{ color: "var(--color-text-muted)" }}
          >
            <Brain className="w-4 h-4 text-purple-400" />
            <span>Brand Memory & Continuity</span>
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-zinc-800/60"
            style={{ color: "var(--color-text-muted)" }}
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>Marketing Projects</span>
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 my-1 h-px" style={{ background: "var(--color-border)" }} />

      {/* Dynamic Recents & Pinned List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {/* Pinned Section */}
        {pinnedSessions.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 px-2 mb-1 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
              <Pin className="w-3 h-3" />
              <span>Pinned</span>
            </div>
            <div className="space-y-0.5">{pinnedSessions.map(renderSessionItem)}</div>
          </div>
        )}

        {/* Recent Chats Section */}
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-wider px-2 mb-1"
            style={{ color: "var(--color-muted)" }}
          >
            Recent Chats
          </p>

          {filteredSessions.length === 0 ? (
            <p className="text-xs px-2 py-3 text-zinc-500 italic">
              {searchTerm ? "No matching conversations" : "No conversations yet"}
            </p>
          ) : (
            <div className="space-y-0.5">{recentSessions.map(renderSessionItem)}</div>
          )}
        </div>
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
            Enterprise Plan
          </p>
        </div>
      </div>
    </aside>
  );
}
