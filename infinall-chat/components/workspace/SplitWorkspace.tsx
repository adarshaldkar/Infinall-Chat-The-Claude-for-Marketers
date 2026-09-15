"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import ChatWorkspace from "./ChatWorkspace";
import ArtifactPanel from "@/components/artifacts/ArtifactPanel";
import DebugTraceDrawer from "@/components/chat/DebugTraceDrawer";
import { CanonicalSSEEvent, SourceCitation, MutationDiff } from "@/lib/gateway/types";
import { SubagentProgressEvent } from "@/lib/subagents/types";
import { ResearchWorkerStatus } from "@/components/research/ResearchProgressTree";
import {
  getStoredSessions,
  createNewSession,
  updateSession,
  persistRemoteSession,
  WorkspaceProject,
} from "@/lib/state/session-store";
import { UploadedAttachment } from "@/lib/multimodal/types";

export interface Artifact {
  id: string;
  title: string;
  type: string;
  language: string;
  content: string;
  version: number;
  isStreaming: boolean;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  thinkingDone?: boolean;
  toolCalls?: Array<{ callId: string; toolName: string; queries: string[]; sources?: SourceCitation[] }>;
  isStreaming?: boolean;
  error?: { message: string; recoverable: boolean };
  approvalRequired?: {
    executionId: string;
    toolName: string;
    actionSummary: string;
    diff: MutationDiff;
    expiresAt: number;
    argsHash?: string;
  };
  model?: string;
  variants?: string[];
  activeVariantIndex?: number;
  researchWorkers?: ResearchWorkerStatus[];
  researchSynthesizing?: boolean;
  researchComplete?: boolean;
}

interface SplitWorkspaceProps {
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  activeSessionId: string | null;
  onSelectSession?: (id: string) => void;
  projects?: WorkspaceProject[];
  activeProjectId?: string | null;
  onProjectChange?: (id: string | null) => void;
  onSessionsChange: () => void;
}

export default function SplitWorkspace({
  sidebarOpen,
  onToggleSidebar,
  activeSessionId,
  onSelectSession,
  projects = [],
  activeProjectId = null,
  onProjectChange,
  onSessionsChange,
}: SplitWorkspaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const loadedSessionIdRef = useRef<string | null>(null);
  const artifact = artifacts.find((item) => item.id === activeArtifactId) ?? null;
  const setArtifact = (value: Artifact | null | ((previous: Artifact | null) => Artifact | null)) => {
    const previous = artifacts.find((item) => item.id === activeArtifactId) ?? null;
    const next = typeof value === "function" ? value(previous) : value;
    if (!next) {
      setArtifacts((current) => current.filter((item) => item.id !== activeArtifactId));
      setActiveArtifactId((current) => {
        const remaining = artifacts.filter((item) => item.id !== current);
        return remaining[0]?.id ?? null;
      });
      return;
    }
    setArtifacts((current) => current.some((item) => item.id === next.id) ? current.map((item) => item.id === next.id ? next : item) : [...current, next]);
    setActiveArtifactId(next.id);
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isDebugDrawerOpen, setIsDebugDrawerOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<{ url: string; title: string; scenes?: any[]; citations?: any[] } | null>(null);
  const [telemetry, setTelemetry] = useState({ promptTokens: 0, completionTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, latencyMs: 0, toolCalls: 0 });

  // Global Keyboard Shortcuts (Cmd/Ctrl+K, Esc, Cmd/Ctrl+Opt+D)
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Cmd/Ctrl + K -> New Chat
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const newSess = createNewSession("New Chat");
        onSelectSession?.(newSess.id);
        onSessionsChange();
        return;
      }

      // Esc -> Close Artifact Panel
      if (e.key === "Escape" && artifact) {
        setArtifact(null);
        return;
      }

      // Cmd/Ctrl + Alt/Opt + D -> Toggle Telemetry Drawer
      if ((e.metaKey || e.ctrlKey) && (e.altKey || e.shiftKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setIsDebugDrawerOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [artifact, onSessionsChange, onSelectSession]);

  // Load active session on mount or when activeSessionId changes
  useEffect(() => {
    if (!activeSessionId) {
      loadedSessionIdRef.current = null;
      setMessages([]);
      setArtifacts([]);
      setActiveArtifactId(null);
      setSessionTitle("");
      return;
    }

    const sessions = getStoredSessions();
    const current = sessions.find((s) => s.id === activeSessionId);
    if (current) {
      loadedSessionIdRef.current = current.id;
      setMessages(current.messages || []);
      const restoredArtifacts = current.artifacts ?? (current.artifact ? [current.artifact] : []);
      setArtifacts(restoredArtifacts);
      setActiveArtifactId(restoredArtifacts[0]?.id ?? null);
      setSessionTitle(current.title || "");
    } else {
      // Load fallback from Supabase API
      fetch(`/api/sessions`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const found = data?.sessions?.find((s: { id: string }) => s.id === activeSessionId);
          if (found) {
            loadedSessionIdRef.current = found.id;
            setMessages(found.messages || []);
            const restoredArtifacts = found.artifacts ?? (found.artifact ? [found.artifact] : []);
            setArtifacts(restoredArtifacts);
            setActiveArtifactId(restoredArtifacts[0]?.id ?? null);
            setSessionTitle(found.title || "");
          }
        })
        .catch(() => undefined);
    }
  }, [activeSessionId]);

  // Persist messages & artifact to session store whenever they change
  useEffect(() => {
    if (!activeSessionId || isGenerating || loadedSessionIdRef.current !== activeSessionId) return;
    
    // Guard: Prevent wiping existing stored messages if current state is empty
    const existing = getStoredSessions().find((s) => s.id === activeSessionId);
    if (existing && existing.messages.length > 0 && messages.length === 0) {
      return;
    }

    updateSession(activeSessionId, { messages, artifact, artifacts });
    const current = getStoredSessions().find((session) => session.id === activeSessionId);
    if (current) void persistRemoteSession(current);
  }, [messages, artifact, artifacts, activeSessionId, isGenerating]);

  const sendMessage = useCallback(
    async (
      userContent: string,
      modelId: string,
      options?: { isDeepResearch?: boolean; attachments?: UploadedAttachment[] }
    ) => {
      if (isGenerating) return;

      let currentId = activeSessionId;
      // Auto-create session if none active
      if (!currentId) {
        const title = userContent.length > 35 ? userContent.slice(0, 35) + "..." : userContent || "New Strategy Chat";
        const newSession = createNewSession(title);
        currentId = newSession.id;
        loadedSessionIdRef.current = currentId;
        setSessionTitle(title);
        onSelectSession?.(currentId);
        onSessionsChange();
      } else if (messages.length === 0) {
        const title = userContent.length > 35 ? userContent.slice(0, 35) + "..." : userContent || "New Strategy Chat";
        updateSession(currentId, { title });
        setSessionTitle(title);
        onSessionsChange();
      }

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: userContent || (options?.attachments?.[0]?.name ? `Analyzed attachment: ${options.attachments[0].name}` : "Uploaded deliverable"),
      };

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        isStreaming: true,
        thinking: "",
        thinkingDone: false,
        toolCalls: [],
        ...(options?.isDeepResearch
          ? { researchWorkers: [], researchSynthesizing: false, researchComplete: false }
          : {}),
      };

      const nextMessages = [...messages, userMessage, assistantMessage];
      setMessages(nextMessages);
      setIsGenerating(true);
      setStatusMessage(options?.isDeepResearch ? "Orchestrating multi-agent research..." : "Planning task...");

      const controller = new AbortController();
      setAbortController(controller);

      const updateAssistant = (updater: (msg: Message) => Message) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMessage.id ? updater(m) : m))
        );
      };

      try {
        // Build the last user message as multimodal content blocks
        const lastUserBlocks: Array<
          | { type: 'text'; text: string }
          | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
        > = [];

        // Add text content
        const effectiveText = userContent || (options?.attachments?.[0]?.name ? `Please analyze: ${options.attachments[0].name}` : 'Analyze the attached file');
        if (effectiveText) {
          lastUserBlocks.push({ type: 'text', text: effectiveText });
        }

        // Handle multimodal attachments (Images, Videos, Documents, Audio)
        if (options?.attachments && options.attachments.length > 0) {
          for (const att of options.attachments) {
            const typedAtt = att as {
              id?: string;
              base64Data?: string;
              mimeType?: string;
              name: string;
              kind?: string;
              url?: string;
              extractedText?: string;
              visionSummary?: any;
              videoAnalysis?: any;
            };

            // If video attached, activate inline interactive video player
            if (typedAtt.kind === 'video' && typedAtt.url) {
              setActiveVideo({
                url: typedAtt.url,
                title: typedAtt.name,
                scenes: typedAtt.videoAnalysis?.scenes,
                citations: typedAtt.videoAnalysis?.citations,
              });
            }
            
            if (typedAtt.base64Data && typedAtt.mimeType?.startsWith('image/')) {
              const cleanBase64 = typedAtt.base64Data.replace(/^data:image\/[a-z0-9.+_-]+;base64,/, '');
              lastUserBlocks.push({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: typedAtt.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: cleanBase64,
                },
              });
            }

            if (typedAtt.visionSummary) {
              const vs = typedAtt.visionSummary;
              const summaryText = `\n\n[Creative Vision Audit for "${typedAtt.name}":\n- Headline/Hook Score: ${vs.headlineHookScore ?? 'N/A'}/10\n- Visual Contrast: ${vs.visualContrastScore ?? 'N/A'}/10\n- CTA Prominence: ${vs.ctaProminenceScore ?? 'N/A'}/10\n- Primary Focal Point: ${vs.primaryFocalPoint ?? 'N/A'}\n- Detected Visual Elements: ${vs.detectedText ?? 'N/A'}\n- Recommendations: ${(vs.recommendations || []).join('; ')}]`;
              lastUserBlocks.push({
                type: 'text',
                text: summaryText,
              });
            }

            if (typedAtt.extractedText) {
              lastUserBlocks.push({
                type: 'text',
                text: `\n\n[Asset Content: "${typedAtt.name}"]\n${typedAtt.extractedText.slice(0, 10000)}`,
              });
            }
          }
        }

        const history = [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          {
            role: 'user' as const,
            content: lastUserBlocks.length > 1 ? lastUserBlocks : effectiveText,
          },
        ];

        // Deep Research uses dedicated SSE stream endpoint
        const apiEndpoint = options?.isDeepResearch ? '/api/research/stream' : '/api/chat';
        const requestBody = options?.isDeepResearch
          ? JSON.stringify({ prompt: effectiveText, sessionId: currentId })
          : JSON.stringify({ messages: history, modelId, sessionId: currentId, projectId: activeProjectId || undefined, activeArtifact: artifact });

        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: requestBody,
          signal: controller.signal,
        });

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data || data === "[DONE]") continue;

            let event: CanonicalSSEEvent | SubagentProgressEvent;
            try {
              event = JSON.parse(data);
            } catch {
              continue;
            }

            switch (event.type) {
              case "plan_start":
                setStatusMessage("Analyzing marketing objective...");
                break;

              case "plan_complete":
                setStatusMessage(`Routing to ${event.payload.recommendedModel}...`);
                break;

              case "thinking_delta":
                updateAssistant((msg) => ({
                  ...msg,
                  thinking: (msg.thinking ?? "") + event.payload.delta,
                }));
                break;

              case "status":
                setStatusMessage(event.payload.message);
                break;

              case "tool_call_start":
                setStatusMessage(`Executing ${event.payload.toolName}...`);
                setTelemetry((current) => ({ ...current, toolCalls: current.toolCalls + 1 }));
                updateAssistant((msg) => ({
                  ...msg,
                  toolCalls: [
                    ...(msg.toolCalls ?? []),
                    {
                      callId: event.payload.callId,
                      toolName: event.payload.toolName,
                      queries: event.payload.query ? [event.payload.query] : [],
                    },
                  ],
                }));
                break;

              case "usage_metadata":
                setTelemetry((current) => ({
                  ...current,
                  promptTokens: event.payload.promptTokens,
                  completionTokens: event.payload.completionTokens,
                  cacheReadTokens: event.payload.cacheReadTokens ?? 0,
                  cacheWriteTokens: event.payload.cacheWriteTokens ?? 0,
                  latencyMs: event.payload.latencyMs,
                }));
                break;

              case "tool_call_result":
                updateAssistant((msg) => ({
                  ...msg,
                  toolCalls: (msg.toolCalls ?? []).map((tc) =>
                    tc.callId === event.payload.callId
                      ? { ...tc, sources: event.payload.sources }
                      : tc
                  ),
                }));
                break;

              case "approval_required":
                updateAssistant((msg) => ({
                  ...msg,
                  approvalRequired: event.payload,
                }));
                break;

              case "text_delta":
                updateAssistant((msg) => ({
                  ...msg,
                  content: msg.content + event.payload.delta,
                  thinkingDone: true,
                }));
                break;

              case "artifact_open":
                setArtifact({
                  id: event.payload.id,
                  title: event.payload.title,
                  type: event.payload.type,
                  language: event.payload.language,
                  content: "",
                  version: 1,
                  isStreaming: true,
                });
                break;

              case "artifact_delta":
                setArtifact((prev) =>
                  prev ? { ...prev, content: prev.content + event.payload.delta } : null
                );
                break;

              case "artifact_complete":
                setArtifact((prev) =>
                  prev
                    ? {
                      ...prev,
                      content: event.payload.fullContent,
                      version: event.payload.version,
                      isStreaming: false,
                    }
                    : null
                );
                break;

              case "error":
                updateAssistant((msg) => ({
                  ...msg,
                  error: {
                    message: event.payload.message,
                    recoverable: event.payload.recoverable,
                  },
                }));
                break;

              case "subagent_spawn":
                setStatusMessage(event.payload.stepMessage ?? "Spawning research agent...");
                updateAssistant((msg) => ({
                  ...msg,
                  researchWorkers: [
                    ...(msg.researchWorkers ?? []),
                    {
                      id: event.payload.subagentId,
                      name: event.payload.taskName ?? "Research Agent",
                      workerKind: event.payload.workerKind ?? "general",
                      status: "pending",
                      stepMessage: event.payload.stepMessage,
                    },
                  ],
                }));
                break;

              case "subagent_progress":
                updateAssistant((msg) => ({
                  ...msg,
                  researchWorkers: (msg.researchWorkers ?? []).map((w) =>
                    w.id === event.payload.subagentId
                      ? { ...w, status: "running", stepMessage: event.payload.stepMessage ?? w.stepMessage }
                      : w
                  ),
                }));
                break;

              case "subagent_complete":
                setStatusMessage("Subagent finished, consolidating...");
                updateAssistant((msg) => ({
                  ...msg,
                  researchWorkers: (msg.researchWorkers ?? []).map((w) =>
                    w.id === event.payload.subagentId
                      ? { ...w, status: "done", stepMessage: event.payload.stepMessage, finding: event.payload.finding }
                      : w
                  ),
                }));
                break;

              case "subagent_error":
                updateAssistant((msg) => ({
                  ...msg,
                  researchWorkers: (msg.researchWorkers ?? []).map((w) =>
                    w.id === event.payload.subagentId ||
                      (event.payload.subagentId === "master-orchestrator" && w.status !== "done")
                      ? { ...w, status: "error", error: event.payload.error }
                      : w
                  ),
                  error:
                    event.payload.subagentId === "master-orchestrator"
                      ? { message: event.payload.error ?? "Research failed", recoverable: true }
                      : msg.error,
                }));
                break;

              case "synthesis_start":
                setStatusMessage(event.payload.stepMessage ?? "Synthesizing research findings...");
                updateAssistant((msg) => ({ ...msg, researchSynthesizing: true }));
                break;

              case "synthesis_complete":
                setStatusMessage("");
                const synthesisSummary = event.payload.synthesis?.summary ?? "";
                updateAssistant((msg) => ({
                  ...msg,
                  researchSynthesizing: false,
                  researchComplete: true,
                  content: msg.content
                    ? `${msg.content}\n\n${synthesisSummary}`
                    : synthesisSummary,
                  thinkingDone: true,
                }));
                break;

              case "done":
                setArtifact((prev) => (prev ? { ...prev, isStreaming: false } : null));
                break;
            }
          }
        }
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? {
                  ...m,
                  error: {
                    message: err instanceof Error ? err.message : "Connection failed",
                    recoverable: true,
                  },
                }
                : m
            )
          );
        }
      } finally {
        setIsGenerating(false);
        setStatusMessage("");
        setAbortController(null);
        setArtifact((prev) => (prev ? { ...prev, isStreaming: false } : null));
        updateAssistant((msg) => ({ ...msg, isStreaming: false }));
        onSessionsChange();
      }
    },
    [messages, isGenerating, activeSessionId, onSessionsChange]
  );

  const stopGeneration = useCallback(() => {
    abortController?.abort();
    setIsGenerating(false);
    setStatusMessage("");
    setAbortController(null);
  }, [abortController]);

  const handleSwitchVariant = useCallback((messageId: string, variantIndex: number) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId && m.variants && m.variants[variantIndex]) {
          return {
            ...m,
            activeVariantIndex: variantIndex,
            content: m.variants[variantIndex],
          };
        }
        return m;
      })
    );
  }, []);

  const handleRegenerate = useCallback((messageId: string) => {
    const msgIndex = messages.findIndex((m) => m.id === messageId);
    if (msgIndex <= 0) return;
    const prevUserMsg = messages[msgIndex - 1];
    if (prevUserMsg && prevUserMsg.role === "user") {
      const modelToUse = messages[msgIndex]?.model || "claude-sonnet-4-6";
      sendMessage(prevUserMsg.content, modelToUse);
    }
  }, [messages, sendMessage]);

  const handleEditMessage = useCallback((messageId: string, newContent: string) => {
    const msgIndex = messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;
    const truncated = messages.slice(0, msgIndex);
    setMessages(truncated);
    sendMessage(newContent, "auto");
  }, [messages, sendMessage]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <PanelGroup orientation="horizontal" className="h-full">
        {/* Chat pane */}
        <Panel defaultSize={artifact ? 50 : 100} minSize={30}>
          <ChatWorkspace
            messages={messages}
            activeSessionId={activeSessionId}
            projects={projects}
            activeProjectId={activeProjectId}
            onProjectChange={onProjectChange}
            isGenerating={isGenerating}
            statusMessage={statusMessage}
            onSendMessage={sendMessage}
            onStop={stopGeneration}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={onToggleSidebar}
            sessionTitle={sessionTitle}
            onRegenerate={handleRegenerate}
            onSwitchVariant={handleSwitchVariant}
            onEditMessage={handleEditMessage}
            activeVideo={activeVideo}
          />
        </Panel>

        {/* Artifact Drawer Pane */}
        {artifact && (
          <>
            <PanelResizeHandle className="w-1.5 transition-colors bg-zinc-800 hover:bg-amber-500 cursor-col-resize" />
            <Panel defaultSize={50} minSize={30}>
              <ArtifactPanel
                artifact={artifact}
                sessionId={activeSessionId}
                onClose={() => setArtifact(null)}
                artifacts={artifacts}
                activeArtifactId={activeArtifactId}
                onSelectArtifact={setActiveArtifactId}
                onUpdateArtifact={(updated) =>
                  setArtifact((prev) => (prev ? { ...prev, ...updated } : null))
                }
              />
            </Panel>
          </>
        )}
      </PanelGroup>

      {/* Telemetry Debug Drawer (Cmd+Opt+D) */}
      <DebugTraceDrawer
        isOpen={isDebugDrawerOpen}
        onClose={() => setIsDebugDrawerOpen(false)}
        activeSessionId={activeSessionId}
        messageCount={messages.length}
        hasArtifact={!!artifact}
        telemetry={telemetry}
      />
    </div>
  );
}
