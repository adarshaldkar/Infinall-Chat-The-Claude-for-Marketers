"use client";

// ============================================================
// Infinall Chat - Interactive Multimodal Video Player
// Supports clickable timestamp seeking from AI response citations
// ============================================================

import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Clock, FastForward } from "lucide-react";
import { VideoScene, TimestampCitation } from "@/lib/multimodal/types";

interface InlineVideoPlayerProps {
  src: string;
  title?: string;
  scenes?: VideoScene[];
  citations?: TimestampCitation[];
  className?: string;
}

export default function InlineVideoPlayer({
  src,
  title = "Campaign Video Asset",
  scenes = [],
  citations = [],
  className = "",
}: InlineVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [activeScene, setActiveScene] = useState<VideoScene | null>(null);

  // Listen for global 'seek-video-player' events dispatched by timestamp citations
  useEffect(() => {
    const handleSeek = (e: Event) => {
      const customEvent = e as CustomEvent<{ timestampSeconds: number; videoUrl?: string }>;
      if (customEvent.detail && typeof customEvent.detail.timestampSeconds === "number") {
        const targetSec = customEvent.detail.timestampSeconds;
        if (videoRef.current) {
          videoRef.current.currentTime = targetSec;
          videoRef.current.play().catch(() => {});
          setIsPlaying(true);
        }
      }
    };

    window.addEventListener("seek-video-player", handleSeek);
    return () => window.removeEventListener("seek-video-player", handleSeek);
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    if (scenes.length > 0) {
      const match = scenes.find((s) => cur >= s.startSeconds && cur <= s.endSeconds);
      setActiveScene(match || null);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || 60);
  };

  const seekTo = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    videoRef.current.play().catch(() => {});
    setIsPlaying(true);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl ${className}`}
    >
      {/* Video Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/80 border-b border-zinc-800/80 text-xs">
        <div className="flex items-center gap-2 font-medium text-zinc-200 truncate">
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1 font-mono text-zinc-400 text-[11px]">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Main Video Screen */}
      <div className="relative group aspect-video bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-contain cursor-pointer"
          onClick={togglePlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          playsInline
        />

        {/* Overlay Play/Pause indicator */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-cyan-500/90 text-zinc-950 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          >
            <Play className="w-7 h-7 fill-current ml-1" />
          </button>
        )}

        {/* Active Scene Overlay Banner */}
        {activeScene && (
          <div className="absolute top-2 left-2 right-2 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 border border-cyan-500/30 backdrop-blur text-xs flex items-center justify-between text-zinc-200 pointer-events-none">
            <span className="font-semibold text-cyan-400">{activeScene.title}</span>
            <span className="text-[10px] text-zinc-400">
              {formatTime(activeScene.startSeconds)} - {formatTime(activeScene.endSeconds)}
            </span>
          </div>
        )}
      </div>

      {/* Custom Control Bar */}
      <div className="p-2.5 bg-zinc-900/95 flex flex-col gap-2">
        {/* Progress Bar with Scene Markers */}
        <div className="relative w-full h-1.5 bg-zinc-800 rounded-full cursor-pointer overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-100"
            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
          />
        </div>

        {/* Quick Timestamp Badges */}
        {(citations.length > 0 || scenes.length > 0) && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
              Key Moments:
            </span>
            {(citations.length > 0 ? citations : scenes).map((item, idx) => {
              const startSec = "startSeconds" in item ? item.startSeconds : 0;
              const label = "label" in item ? item.label : formatTime(startSec);
              const titleText = "title" in item ? item.title : item.snippet || "";

              return (
                <button
                  key={`marker-${idx}-${startSec}`}
                  onClick={() => seekTo(startSec)}
                  className="px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-cyan-950/60 hover:border-cyan-500/50 border border-zinc-700/60 text-[11px] font-mono text-cyan-300 transition-colors flex items-center gap-1"
                  title={titleText}
                >
                  <FastForward className="w-2.5 h-2.5" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
