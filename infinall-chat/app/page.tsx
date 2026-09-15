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
  updateSession,
  loadRemoteSessions,
  persistRemoteSession,
  deleteRemoteSession,
  WorkspaceProject,
} from "@/lib/state/session-store";

import ToolsDirectoryModal from "@/components/directory/ToolsDirectoryModal";
import { KnowledgeBaseModal } from "@/components/knowledge/KnowledgeBaseModal";
import { MemoryViewerModal } from "@/components/knowledge/MemoryViewerModal";
import ProjectManager from "@/components/projects/ProjectManager";
import { CampaignPipeline } from "@/components/campaigns/CampaignPipeline";
import { ApprovalCenter } from "@/components/approvals/ApprovalCenter";

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveId] = useState<string | null>(null);
  const [isToolsDirectoryOpen, setIsToolsDirectoryOpen] = useState(false);
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(false);
  const [isBrandMemoryOpen, setIsBrandMemoryOpen] = useState(false);
  const [isCampaignPipelineOpen, setIsCampaignPipelineOpen] = useState(false);
  const [isApprovalCenterOpen, setIsApprovalCenterOpen] = useState(false);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);

  const refreshSessions = useCallback(async () => {
    const stored = getStoredSessions();
    setSessions(stored);
    
    // Determine active session ID
    const currentActive = getActiveSessionId();
    if (currentActive && stored.some((s) => s.id === currentActive)) {
      setActiveId(currentActive);
    } else if (!activeSessionId && stored.length > 0) {
      setActiveId(stored[0].id);
      setActiveSessionId(stored[0].id);
    }

    try {
      const remote = await loadRemoteSessions();
      if (remote && Array.isArray(remote)) {
        setSessions(remote);
        const activeAfterRemote = getActiveSessionId();
        if (activeAfterRemote && remote.some((s) => s.id === activeAfterRemote)) {
          setActiveId(activeAfterRemote);
        } else if (!activeSessionId && remote.length > 0) {
          setActiveId(remote[0].id);
          setActiveSessionId(remote[0].id);
        }
      }
    } catch {
      // Ignore remote sync failure, local storage is reliable
    }
  }, [activeSessionId]);

  useEffect(() => {
    // Defer to avoid synchronous setState cascade inside effect
    const frame = requestAnimationFrame(() => {
      refreshSessions();
    });

    fetch("/api/projects")
      .then((res) => res.ok ? res.json() : null)
      .then((data: { projects?: WorkspaceProject[] } | null) => setProjects(data?.projects ?? []))
      .catch(() => setProjects([]));

    const handleOpenTools = () => setIsToolsDirectoryOpen(true);
    window.addEventListener("open-tools-directory", handleOpenTools);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("open-tools-directory", handleOpenTools);
    };
  }, [refreshSessions]);

  const handleNewChat = () => {
    const newSession = createNewSession("New Chat");
    setSessions(getStoredSessions());
    setActiveId(newSession.id);
    void persistRemoteSession(newSession);
  };

  const handleSelectSession = (id: string) => {
    setActiveId(id);
    setActiveSessionId(id);
  };

  const handleDeleteSession = (id: string) => {
    const remaining = deleteStoredSession(id);
    void deleteRemoteSession(id);
    setSessions(remaining);
    if (activeSessionId === id) {
      const nextActive = remaining.length > 0 ? remaining[0].id : null;
      setActiveId(nextActive);
      if (nextActive) setActiveSessionId(nextActive);
    }
  };

  const handleRenameSession = (id: string, newTitle: string) => {
    updateSession(id, { title: newTitle });
    refreshSessions();
  };

  const handlePinSession = (id: string) => {
    const session = sessions.find((s) => s.id === id);
    if (session) {
      updateSession(id, { isPinned: !session.isPinned });
      refreshSessions();
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
        onRenameSession={handleRenameSession}
        onPinSession={handlePinSession}
        onOpenToolsDirectory={() => setIsToolsDirectoryOpen(true)}
        onOpenKnowledgeBase={() => setIsKnowledgeBaseOpen(true)}
        onOpenBrandMemory={() => setIsBrandMemoryOpen(true)}
        onOpenCampaignPipeline={() => setIsCampaignPipelineOpen(true)}
        onOpenApprovalCenter={() => setIsApprovalCenterOpen(true)}
      />
      <main className="flex-1 min-w-0 overflow-hidden relative">
        <button onClick={() => setIsProjectManagerOpen(true)} className="absolute right-4 top-3 z-20 rounded-lg border border-zinc-700 bg-zinc-900/90 px-3 py-1.5 text-[11px] font-medium text-zinc-300 shadow-lg hover:border-cyan-500/50 hover:text-cyan-300">Manage projects</button>
        <SplitWorkspace
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((p) => !p)}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          projects={projects}
          activeProjectId={activeProjectId}
          onProjectChange={setActiveProjectId}
          onSessionsChange={refreshSessions}
        />
      </main>

      {/* 100+ Tools & MCP Directory Modal */}
      <ToolsDirectoryModal
        isOpen={isToolsDirectoryOpen}
        onClose={() => setIsToolsDirectoryOpen(false)}
      />

      {/* Knowledge Base & pgvector Multi-Format Modal */}
      <KnowledgeBaseModal
        isOpen={isKnowledgeBaseOpen}
        onClose={() => setIsKnowledgeBaseOpen(false)}
      />

      {/* Brand Memory & Continuity Modal */}
      <MemoryViewerModal
        isOpen={isBrandMemoryOpen}
        onClose={() => setIsBrandMemoryOpen(false)}
        currentProjectId={activeProjectId || undefined}
      />

      {/* Campaign Pipeline Modal */}
      {isCampaignPipelineOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-6 animate-in fade-in duration-200">
          <div className="relative bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-6xl h-[90vh] shadow-2xl flex flex-col overflow-hidden">
            <button
              onClick={() => setIsCampaignPipelineOpen(false)}
              className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-neutral-900/80 border border-neutral-800 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition"
              title="Close Campaign Pipeline"
            >
              ✕
            </button>
            <div className="flex-1 h-full overflow-hidden">
              <CampaignPipeline
                currentProjectId={activeProjectId || undefined}
                onClose={() => setIsCampaignPipelineOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Approval Center Modal */}
      {isApprovalCenterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-6 animate-in fade-in duration-200">
          <div className="relative bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col overflow-hidden">
            <button
              onClick={() => setIsApprovalCenterOpen(false)}
              className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-neutral-900/80 border border-neutral-800 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition"
              title="Close Approval Center"
            >
              ✕
            </button>
            <div className="flex-1 h-full overflow-hidden">
              <ApprovalCenter
                currentProjectId={activeProjectId || undefined}
                onClose={() => setIsApprovalCenterOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      <ProjectManager
        isOpen={isProjectManagerOpen}
        projects={projects}
        onClose={() => setIsProjectManagerOpen(false)}
        onProjectsChange={(next) => setProjects(next)}
      />
    </div>
  );
}
