"use client";

import React, { useState, useRef, useMemo } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2, Download, RotateCcw, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoPlayerRendererProps {
  content: string;
  isStreaming?: boolean;
}

export default function VideoPlayerRenderer({ content, isStreaming }: VideoPlayerRendererProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Extract video src or video metadata from content. Never falls back to a
  // fabricated sample: if no real URL is present we render an explicit
  // "no video source" state instead of showing some unrelated clip.
  const videoSrc = useMemo<string | null>(() => {
    const trimmed = content.trim();
    // Direct URL check
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("data:video/")
    ) {
      const candidate = trimmed.split(/\s+/)[0];
      if (candidate.includes("://") || candidate.startsWith("data:video/")) return candidate;
    }
    // Tag check: <video src="..."
    const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      return srcMatch[1];
    }
    // Markdown check: [video](url) or ![video](url)
    const mdMatch = trimmed.match(/!?\[.*?\]\((https?:\/\/[^\s)]+)\)/i);
    if (mdMatch && mdMatch[1]) {
      return mdMatch[1];
    }
    return null;
  }, [content]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
      setCurrentTime(target);
    }
  };

  const cycleSpeed = () => {
    if (!videoRef.current) return;
    const speeds = [0.5, 1, 1.25, 1.5, 2];
    const nextIndex = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];
    videoRef.current.playbackRate = nextSpeed;
    setPlaybackRate(nextSpeed);
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const handleDownload = () => {
    if (!videoSrc) return;
    const a = document.createElement("a");
    a.href = videoSrc;
    a.download = "campaign-creative.mp4";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="flex flex-col h-full w-full bg-neutral-950 text-neutral-100 overflow-hidden select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 bg-neutral-900/60 backdrop-blur text-xs">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-emerald-400" />
          <span className="font-medium text-neutral-200">Video Asset Preview</span>
          {isStreaming && (
            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-mono">
              Buffering...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={cycleSpeed}
            className="h-7 px-2 text-xs font-mono text-neutral-300 hover:text-white"
            title="Cycle playback speed"
          >
            {playbackRate}x
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-7 px-2.5 text-xs text-neutral-300 hover:text-white"
            title="Download Video File"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Download
          </Button>
        </div>
      </div>

      {/* Video Viewport */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {videoSrc ? (
          <>
            <video
              ref={videoRef}
              src={videoSrc}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              onClick={togglePlay}
              className="max-h-full max-w-full object-contain cursor-pointer"
            />

            {/* Big play overlay if paused */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-neutral-900/80 backdrop-blur border border-neutral-700 flex items-center justify-center text-white hover:bg-emerald-600/80 hover:scale-110 transition-all shadow-xl"
                title="Play Video"
              >
                <Play className="w-7 h-7 ml-1" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-neutral-500 text-xs select-none">
            <Video className="w-10 h-10 text-neutral-700" />
            <span>No video source in this artifact.</span>
            <span className="text-neutral-600">
              Provide a direct <code className="text-neutral-400">https://</code> or{" "}
              <code className="text-neutral-400">data:video/…</code> URL to preview here.
            </span>
          </div>
        )}
      </div>

      {/* Player Controls Bar */}
      <div className="px-4 py-3 border-t border-neutral-800 bg-neutral-900/80 backdrop-blur flex flex-col gap-2">
        {/* Timeline Slider */}
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <span>{formatTime(duration)}</span>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlay}
              className="h-8 w-8 p-0 text-white hover:bg-neutral-800"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  setCurrentTime(0);
                }
              }}
              className="h-8 w-8 p-0 text-neutral-400 hover:text-white"
              title="Restart"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="h-8 w-8 p-0 text-neutral-400 hover:text-white"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFullscreen}
              className="h-8 w-8 p-0 text-neutral-400 hover:text-white"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
