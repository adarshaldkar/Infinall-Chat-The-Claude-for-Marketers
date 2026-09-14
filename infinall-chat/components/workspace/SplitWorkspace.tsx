"use client";

import { useState, useCallback, useEffect } from "react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import ChatWorkspace from "./ChatWorkspace";
import ArtifactPanel from "@/components/artifacts/ArtifactPanel";
import DebugTraceDrawer from "@/components/chat/DebugTraceDrawer";
import { CanonicalSSEEvent, SourceCitation, MutationDiff } from "@/lib/gateway/types";
import {
  getStoredSessions,
  createNewSession,
  updateSession,
} from "@/lib/state/session-store";

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
}

interface SplitWorkspaceProps {
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  activeSessionId: string | null;
  onSessionsChange: () => void;
}

export default function SplitWorkspace({
  sidebarOpen,
  onToggleSidebar,
  activeSessionId,
  onSessionsChange,
}: SplitWorkspaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isDebugDrawerOpen, setIsDebugDrawerOpen] = useState(false);

  // Global Keyboard Shortcuts (Cmd/Ctrl+K, Esc, Cmd/Ctrl+Opt+D)
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Cmd/Ctrl + K -> New Chat
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        createNewSession("New Chat");
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
  }, [artifact, onSessionsChange]);

  // Load active session on mount or when activeSessionId changes
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      setArtifact(null);
      setSessionTitle("");
      return;
    }

    const sessions = getStoredSessions();
    const current = sessions.find((s) => s.id === activeSessionId);
    if (current) {
      setMessages(current.messages);
      setArtifact(current.artifact);
      setSessionTitle(current.title);
    }
  }, [activeSessionId]);

  // Persist messages & artifact to session store whenever they change
  useEffect(() => {
    if (!activeSessionId || isGenerating) return;
    updateSession(activeSessionId, { messages, artifact });
  }, [messages, artifact, activeSessionId, isGenerating]);

  const sendMessage = useCallback(
    async (
      userContent: string,
      modelId: string,
      options?: { isDeepResearch?: boolean; attachments?: Array<{ name: string; extractedText?: string; visionSummary?: { headlineHookScore: number; recommendations: string[] } }> }
    ) => {
      if (isGenerating) return;

      let currentId = activeSessionId;
      // Auto-create session if none active
      if (!currentId) {
        const title = userContent.length > 35 ? userContent.slice(0, 35) + "..." : userContent || "New Strategy Chat";
        const newSession = createNewSession(title);
        currentId = newSession.id;
        setSessionTitle(title);
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
        // Build the last user message as multimodal content blocks (text + images)
        type ContentBlock =
          | { type: 'text'; text: string }
          | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

        const lastUserBlocks: ContentBlock[] = [];

        // Add text content
        const effectiveText = userContent || (options?.attachments?.[0]?.name ? `Please analyze: ${options.attachments[0].name}` : 'Analyze the attached file');
        if (effectiveText) {
          lastUserBlocks.push({ type: 'text', text: effectiveText });
        }

        // Add image content blocks for image attachments (real vision)
        if (options?.attachments) {
          for (const att of options.attachments) {
            if ((att as { base64Data?: string; mimeType?: string } & typeof att).base64Data && (att as { mimeType?: string } & typeof att).mimeType?.startsWith('image/')) {
              const typedAtt = att as { base64Data: string; mimeType: string; name: string };
              lastUserBlocks.push({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: typedAtt.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: typedAtt.base64Data,
                },
              });
            } else if (att.extractedText) {
              // Document: inject extracted text as context
              lastUserBlocks.push({
                type: 'text',
                text: `\n\n[Document: ${att.name}]\n${att.extractedText.slice(0, 8000)}`,
              });
            } else if (att.visionSummary) {
              lastUserBlocks.push({
                type: 'text',
                text: `\n\n[Creative Analysis: ${att.name}]\nHook Score: ${att.visionSummary.headlineHookScore}/10\nRecommendations: ${att.visionSummary.recommendations.join('; ')}`,
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
          : JSON.stringify({ messages: history, modelId, sessionId: currentId });

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

            let event: CanonicalSSEEvent;
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
          />
        </Panel>

        {/* Artifact Drawer Pane */}
        {artifact && (
          <>
            <PanelResizeHandle className="w-1.5 transition-colors bg-zinc-800 hover:bg-amber-500 cursor-col-resize" />
            <Panel defaultSize={50} minSize={30}>
              <ArtifactPanel
                artifact={artifact}
                onClose={() => setArtifact(null)}
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
      />
    </div>
  );
}
