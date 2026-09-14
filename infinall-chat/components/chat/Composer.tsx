"use client";

import { useRef, useState, useEffect, KeyboardEvent } from "react";
import { Send, Square, Mic, ChevronDown, Loader2, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import SkillsMenuPopover from "@/components/skills/SkillsMenuPopover";
import ResearchModeToggle from "@/components/research/ResearchModeToggle";
import AttachmentPreviewBar from "@/components/multimodal/AttachmentPreviewBar";
import AttachMenuPopover from "@/components/chat/AttachMenuPopover";
import { UploadedAttachment } from "@/lib/multimodal/types";

const MODELS = [
  { id: "auto", label: "⚡ Auto", description: "Planner picks the best model" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", description: "Best for campaigns & copy" },
  { id: "Kimi-K2.6", label: "Kimi K2.6", description: "Fast factual queries & reasoning" },
  { id: "claude-opus-5", label: "Claude Opus 5", description: "Best for deep strategy & research" },
  { id: "gpt-5-6", label: "GPT-5.6", description: "Second opinion & cross-model check" },
];

interface ComposerProps {
  isGenerating: boolean;
  onSend: (content: string, modelId: string, options?: { isDeepResearch?: boolean; attachments?: UploadedAttachment[]; webSearchEnabled?: boolean }) => void;
  onStop: () => void;
}

type DictationState = "idle" | "recording" | "processing" | "transcribed";

interface CatalogModel {
  id: string;
  name?: string;
  provider?: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResult>;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

export default function Composer({ isGenerating, onSend, onStop }: ComposerProps) {
  const [value, setValue] = useState("");
  const [models, setModels] = useState(MODELS);
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [modelOpen, setModelOpen] = useState(false);
  const [isDeepResearch, setIsDeepResearch] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);

  // Dynamic model discovery from catalog endpoint
  useEffect(() => {
    fetch("/api/models")
      .then((res) => res.json())
      .then((data) => {
        if (data.models && Array.isArray(data.models) && data.models.length > 0) {
          const dynamicList = [
            { id: "auto", label: "⚡ Auto", description: "Planner picks the best model" },
            ...data.models.map((m: CatalogModel) => ({
              id: m.id,
              label: m.name || m.id,
              description:
                m.id === "claude-sonnet-4-6"
                  ? "Best for campaigns & copy"
                  : m.id === "Kimi-K2.6"
                  ? "Fast factual queries & reasoning"
                  : m.id === "claude-opus-5"
                  ? "Best for deep strategy & research"
                  : m.id === "gpt-5-6"
                  ? "Second opinion & cross-model check"
                  : `${m.provider ?? "Gateway"} model`,
            })),
          ];
          setModels(dynamicList);
        }
      })
      .catch((err) => {
        console.warn("Using fallback model catalog:", err);
      });
  }, []);

  // Dictation state machine
  const [dictationState, setDictationState] = useState<DictationState>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Slash skills state
  const [isSkillsMenuOpen, setIsSkillsMenuOpen] = useState(false);
  const [skillsFilter, setSkillsFilter] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }, [value]);

  // Focus after response
  useEffect(() => {
    if (!isGenerating) textareaRef.current?.focus();
  }, [isGenerating]);

  // Detect slash command typing
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setValue(val);

    if (val.startsWith("/") && !val.includes(" ")) {
      setIsSkillsMenuOpen(true);
      setSkillsFilter(val);
    } else {
      setIsSkillsMenuOpen(false);
    }
  };

  const handleSelectSkill = (slug: string) => {
    setValue(`${slug} `);
    setIsSkillsMenuOpen(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isSkillsMenuOpen && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Tab")) {
      // Allow popover keyboard handler to intercept
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.attachment) {
            setAttachments((prev) => [...prev, data.attachment]);
          }
        }
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleScreenshotUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.attachment) {
          setAttachments((prev) => [...prev, data.attachment]);
        }
      }
    } catch (err) {
      console.error("Screenshot upload error:", err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || isGenerating) return;

    onSend(trimmed, selectedModel.id, {
      isDeepResearch,
      attachments,
      webSearchEnabled,
    });

    setValue("");
    setAttachments([]);
    setIsSkillsMenuOpen(false);
  };

  // Clean up recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startDictation = async () => {
    try {
      setRecordingSeconds(0);
      audioChunksRef.current = [];

const SpeechRecognition =
  (window as Window & { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ||
  (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const text = event.results[i][0].transcript.trim();
              if (text) {
                setValue((prev) => (prev ? `${prev} ${text}` : text));
              }
            }
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.warn("Speech recognition error:", event.error);
        };

        speechRecognitionRef.current = recognition;
        try {
          recognition.start();
        } catch {}
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(250);
      setDictationState("recording");

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Mic access error:", err);
      alert("Microphone access was denied or is not supported in this browser.");
      setDictationState("idle");
    }
  };

  const stopDictation = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      setDictationState("processing");

      mediaRecorderRef.current.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());

          const formData = new FormData();
          formData.append("file", audioBlob, "dictation.webm");

          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.transcription?.text && !data.transcription.text.includes("[Speech recognition error")) {
              setValue((prev) => {
                const trimmed = prev.trim();
                const newText = data.transcription.text.trim();
                if (trimmed.includes(newText)) return trimmed;
                return trimmed ? `${trimmed} ${newText}` : newText;
              });
            }
          }
        } catch (e) {
          console.error("Transcribe API error:", e);
        } finally {
          setDictationState("transcribed");
          setTimeout(() => setDictationState("idle"), 1200);
        }
      };

      mediaRecorderRef.current.stop();
    } else {
      setDictationState("idle");
    }
  };

  const formatRecordingTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      className="relative rounded-2xl border p-2 shadow-sm transition-colors"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      {/* Slash command autocomplete popup */}
      <SkillsMenuPopover
        isOpen={isSkillsMenuOpen}
        filterText={skillsFilter}
        onSelectSkill={handleSelectSkill}
        onClose={() => setIsSkillsMenuOpen(false)}
      />

      {/* Attachment Chips Bar */}
      <AttachmentPreviewBar
        attachments={attachments}
        onRemoveAttachment={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
      />

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={
          isDeepResearch
            ? "Enter deep research topic or competitive analysis objective..."
            : "Ask Infinall or type / for skills (/ad-copy, /brand-voice, /seo-audit)..."
        }
        rows={1}
        className="w-full resize-none bg-transparent text-sm px-2 py-2 outline-none leading-relaxed"
        style={{ color: "var(--color-text)", minHeight: "44px", maxHeight: "180px" }}
      />

      {/* Hidden file upload input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.docx,.csv"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Bottom toolbar */}
      <div className="flex items-center justify-between mt-1 px-1">
        {/* Left controls: Claude + attach menu, voice dictation, research toggle, dynamic model selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <AttachMenuPopover
            onOpenFilePicker={() => fileInputRef.current?.click()}
            onAttachScreenshot={handleScreenshotUpload}
            onOpenSkills={() => setIsSkillsMenuOpen(true)}
            onOpenToolsDirectory={() => {
              window.dispatchEvent(new CustomEvent("open-tools-directory"));
            }}
            webSearchEnabled={webSearchEnabled}
            onToggleWebSearch={() => setWebSearchEnabled((prev) => !prev)}
          />

          {/* Voice Dictation (Mic) Button */}
          <button
            type="button"
            onClick={dictationState === "recording" ? stopDictation : startDictation}
            disabled={dictationState === "processing"}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              dictationState === "recording"
                ? "bg-rose-500/20 text-rose-400 animate-pulse border border-rose-500/40"
                : dictationState === "processing"
                ? "text-amber-400"
                : "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            )}
            title={
              dictationState === "recording"
                ? "Stop recording dictation"
                : dictationState === "processing"
                ? "Transcribing voice..."
                : "Voice dictation (Speech-to-Text)"
            }
          >
            {dictationState === "recording" ? (
              <Radio className="w-4 h-4 text-rose-500 animate-spin" />
            ) : dictationState === "processing" ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          {/* Inline Recording Waveform Banner */}
          {dictationState === "recording" && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping mr-1" />
              <span className="font-mono font-medium text-[11px]">{formatRecordingTime(recordingSeconds)}</span>
              <div className="flex items-center gap-0.5 h-3 ml-1">
                <span className="w-0.5 bg-rose-400 animate-bounce h-2" style={{ animationDelay: "0ms" }} />
                <span className="w-0.5 bg-rose-400 animate-bounce h-3.5" style={{ animationDelay: "150ms" }} />
                <span className="w-0.5 bg-rose-400 animate-bounce h-1.5" style={{ animationDelay: "300ms" }} />
                <span className="w-0.5 bg-rose-400 animate-bounce h-3" style={{ animationDelay: "100ms" }} />
              </div>
              <button
                type="button"
                onClick={stopDictation}
                className="ml-1 text-[10px] font-semibold underline text-rose-300 hover:text-rose-100"
              >
                Done
              </button>
            </div>
          )}

          {dictationState === "processing" && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
              <span className="text-[11px] font-medium">Transcribing voice...</span>
            </div>
          )}

          {/* Deep Research Mode Toggle */}
          <ResearchModeToggle
            isDeepResearch={isDeepResearch}
            onToggle={() => setIsDeepResearch((prev) => !prev)}
          />

          {/* Model selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setModelOpen((p) => !p)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors"
              style={{
                color: "var(--color-text-muted)",
                borderColor: "var(--color-border)",
                background: "var(--color-canvas)",
              }}
            >
              {selectedModel.label}
              <ChevronDown className="w-3 h-3" />
            </button>

            {modelOpen && (
              <div
                className="absolute bottom-full mb-1 left-0 rounded-xl border shadow-xl overflow-hidden z-50 min-w-48"
                style={{
                  background: "var(--color-card)",
                  borderColor: "var(--color-border)",
                }}
              >
                {models.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => {
                      setSelectedModel(model);
                      setModelOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm transition-colors"
                    style={{
                      color: selectedModel.id === model.id ? "var(--color-accent)" : "var(--color-text)",
                      background:
                        selectedModel.id === model.id ? "rgba(34,211,238,0.1)" : "transparent",
                    }}
                  >
                    <div className="font-medium">{model.label}</div>
                    {model.description && (
                      <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)", opacity: 0.75 }}>
                        {model.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Send / Stop button */}
        {isGenerating ? (
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: "var(--color-error)", color: "white" }}
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!value.trim() && attachments.length === 0}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-200",
              value.trim() || attachments.length > 0
                ? "opacity-100 hover:scale-105"
                : "opacity-30 cursor-not-allowed"
            )}
            style={{
              background: value.trim() || attachments.length > 0 ? "var(--color-accent)" : "var(--color-border)",
              color: "white",
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Hint */}
      <p className="text-center text-[11px] mt-1.5 text-zinc-500 font-mono">
        Enter to send · Shift+Enter for new line · Type / for Skills
      </p>
    </div>
  );
}
