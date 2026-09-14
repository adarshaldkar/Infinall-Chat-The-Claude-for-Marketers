"use client";

import { useState, useCallback, useEffect } from "react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import ChatWorkspace from "./ChatWorkspace";
import ArtifactPanel from "@/components/artifacts/ArtifactPanel";
import { CanonicalSSEEvent, SourceCitation, MutationDiff } from "@/lib/gateway/types";
import {
  ChatSession,
  getStoredSessions,
  getActiveSessionId,
  setActiveSessionId,
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

      let effectiveContent = userContent;
      if (options?.isDeepResearch && !effectiveContent.startsWith("/research")) {
        effectiveContent = `/research ${effectiveContent}`;
      }

      if (options?.attachments && options.attachments.length > 0) {
        const attachDescriptions = options.attachments
          .map((a) => {
            if (a.visionSummary) {
              return `[Attached Creative: ${a.name} - Hook Score: ${a.visionSummary.headlineHookScore}/10. Recommendations: ${a.visionSummary.recommendations.join("; ")}]`;
            }
            if (a.extractedText) {
              return `[Attached Document ${a.name}:\n${a.extractedText.slice(0, 1000)}]`;
            }
            return `[Attached File: ${a.name}]`;
          })
          .join("\n\n");

        effectiveContent = effectiveContent ? `${effectiveContent}\n\n${attachDescriptions}` : attachDescriptions;
      }

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
        const history = [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content: effectiveContent },
        ];

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: history, modelId, sessionId: currentId }),
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

  return (
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
  );
}
