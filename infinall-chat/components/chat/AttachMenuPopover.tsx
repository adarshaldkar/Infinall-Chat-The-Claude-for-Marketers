"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  Paperclip,
  Camera,
  FolderPlus,
  Sparkles,
  Blocks,
  Plug,
  Globe,
  Check,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AttachMenuPopoverProps {
  onOpenFilePicker: () => void;
  onAttachScreenshot: (file: File) => void;
  onOpenSkills: () => void;
  onOpenToolsDirectory?: () => void;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
}

export default function AttachMenuPopover({
  onOpenFilePicker,
  onAttachScreenshot,
  onOpenSkills,
  onOpenToolsDirectory,
  webSearchEnabled,
  onToggleWebSearch,
}: AttachMenuPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showProjectsSubmenu, setShowProjectsSubmenu] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowProjectsSubmenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+U / Cmd+U for file upload
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
        e.preventDefault();
        onOpenFilePicker();
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenFilePicker]);

  // Real-time Screen Capture
  const handleCaptureScreenshot = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      alert("Screen capture is not supported in this browser.");
      return;
    }

    setIsCapturing(true);
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" } as MediaTrackConstraints,
      });

      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      video.play().catch(() => {});

      // Wait until the stream has real dimensions before attempting to draw
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 3000);
        const tick = () => {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            clearTimeout(timeout);
            resolve();
          } else {
            requestAnimationFrame(tick);
          }
        };
        tick();
      });

      // Wait for at least one decoded frame so the canvas isn't blank
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 2000);
        if (typeof (video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number }).requestVideoFrameCallback === "function") {
          (video as HTMLVideoElement & { requestVideoFrameCallback: (cb: () => void) => number }).requestVideoFrameCallback(() => {
            clearTimeout(timeout);
            resolve();
          });
        } else {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }
      });

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not initialise 2D canvas context");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      stream.getTracks().forEach((track) => track.stop());
      stream = null;

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (blob) {
        const file = new File([blob], `screenshot_${Date.now()}.png`, { type: "image/png" });
        onAttachScreenshot(file);
        setIsOpen(false);
      }
    } catch (err) {
      if ((err as DOMException)?.name !== "NotAllowedError") {
        alert(err instanceof Error ? err.message : "Screen capture failed. If it keeps happening, try selecting a window instead of the whole browser tab.");
      }
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
      setIsCapturing(false);
    }
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* The Claude + Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 border",
          isOpen
            ? "bg-zinc-800 text-white border-zinc-600 rotate-45"
            : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-700/80 hover:scale-105"
        )}
        title="Add files, screenshots, tools, skills, or web search (Ctrl+U)"
      >
        <Plus className="w-4 h-4 transition-transform duration-200" />
      </button>

      {/* Claude-style Floating Menu */}
      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl border p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-xl"
          style={{
            borderColor: "rgba(255, 255, 255, 0.12)",
            background: "#18181b",
          }}
        >
          {/* Item: Add files or photos */}
          <button
            type="button"
            onClick={() => {
              onOpenFilePicker();
              setIsOpen(false);
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-200 hover:bg-zinc-800/80 hover:text-white transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <Paperclip className="w-4 h-4 text-zinc-400 group-hover:text-cyan-400 transition-colors" />
              <span className="font-medium">Add files or photos</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
              Ctrl U
            </span>
          </button>

          {/* Item: Take a screenshot */}
          <button
            type="button"
            onClick={handleCaptureScreenshot}
            disabled={isCapturing}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-200 hover:bg-zinc-800/80 hover:text-white transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              {isCapturing ? (
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              ) : (
                <Camera className="w-4 h-4 text-zinc-400 group-hover:text-cyan-400 transition-colors" />
              )}
              <span className="font-medium">
                {isCapturing ? "Capturing screen..." : "Take a screenshot"}
              </span>
            </div>
          </button>

          {/* Item: Add to project */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowProjectsSubmenu((p) => !p);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-200 hover:bg-zinc-800/80 hover:text-white transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <FolderPlus className="w-4 h-4 text-zinc-400 group-hover:text-amber-400 transition-colors" />
                <span className="font-medium">Add to project</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            {showProjectsSubmenu && (
              <div className="absolute left-full top-0 ml-1.5 w-56 rounded-xl border border-zinc-700/80 bg-zinc-900 p-1.5 shadow-2xl z-50 text-xs">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  Marketing Workspaces
                </div>
                <button
                  type="button"
                  onClick={() => {
                    alert("Added context to: Q3 Growth & Acquisition Campaign");
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white"
                >
                  Q3 Growth & Acquisition
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert("Added context to: Brand Brain Voice & Personas");
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white"
                >
                  Brand Brain Guidelines
                </button>
              </div>
            )}
          </div>

          {/* Item: Skills */}
          <button
            type="button"
            onClick={() => {
              onOpenSkills();
              setIsOpen(false);
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-200 hover:bg-zinc-800/80 hover:text-white transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-zinc-400 group-hover:text-amber-400 transition-colors" />
              <span className="font-medium">Skills</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
          </button>

          {/* Item: Add connector (100+ Tools Directory) */}
          <button
            type="button"
            onClick={() => {
              if (onOpenToolsDirectory) onOpenToolsDirectory();
              setIsOpen(false);
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-200 hover:bg-zinc-800/80 hover:text-white transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <Blocks className="w-4 h-4 text-zinc-400 group-hover:text-cyan-400 transition-colors" />
              <span className="font-medium">Add connector</span>
            </div>
            <span className="text-[10px] text-cyan-400 font-mono">100+</span>
          </button>

          {/* Item: Add plugins */}
          <button
            type="button"
            onClick={() => {
              alert("Infinall Plugin & Custom MCP Server connection manager.");
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-zinc-200 hover:bg-zinc-800/80 hover:text-white transition-colors group"
          >
            <Plug className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
            <span className="font-medium">Add plugins</span>
          </button>

          <div className="my-1 border-t border-zinc-800" />

          {/* Item: Web search (with Checkmark ✓) */}
          <button
            type="button"
            onClick={() => {
              onToggleWebSearch();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-200 hover:bg-zinc-800/80 hover:text-white transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-zinc-400 group-hover:text-blue-400 transition-colors" />
              <span className="font-medium">Web search</span>
            </div>
            {webSearchEnabled && (
              <Check className="w-4 h-4 text-cyan-400 font-bold" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
