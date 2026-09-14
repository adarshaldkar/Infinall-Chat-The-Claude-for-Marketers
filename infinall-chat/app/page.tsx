"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/workspace/Sidebar";
import SplitWorkspace from "@/components/workspace/SplitWorkspace";
import {
  ChatSession,
  getStoredSessions,
  getActiveSessionId,
  setActiveSessionId,
  createNewSession,
  deleteStoredSession,
} from "@/lib/state/session-store";

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveId] = useState<string | null>(null);

  const refreshSessions = useCallback(() => {
    const stored = getStoredSessions();
    setSessions(stored);
    const active = getActiveSessionId();
    if (active && stored.some((s) => s.id === active)) {
      setActiveId(active);
    } else if (stored.length > 0) {
      setActiveId(stored[0].id);
      setActiveSessionId(stored[0].id);
    } else {
      setActiveId(null);
    }
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const handleNewChat = () => {
    const newSession = createNewSession("New Chat");
    setSessions(getStoredSessions());
    setActiveId(newSession.id);
  };

  const handleSelectSession = (id: string) => {
    setActiveId(id);
    setActiveSessionId(id);
  };

  const handleDeleteSession = (id: string) => {
    const remaining = deleteStoredSession(id);
    setSessions(remaining);
    if (activeSessionId === id) {
      const nextActive = remaining.length > 0 ? remaining[0].id : null;
      setActiveId(nextActive);
      if (nextActive) setActiveSessionId(nextActive);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--color-background)" }}>
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((p) => !p)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
      />
      <main className="flex-1 min-w-0 overflow-hidden relative">
        <SplitWorkspace
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((p) => !p)}
          activeSessionId={activeSessionId}
          onSessionsChange={refreshSessions}
        />
      </main>
    </div>
  );
}
