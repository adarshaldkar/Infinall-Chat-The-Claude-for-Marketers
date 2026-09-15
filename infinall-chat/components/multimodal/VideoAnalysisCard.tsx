'use client';

// ============================================================
// Infinall Chat - Video Intelligence Result Card
// Displays video marketing breakdown: hook rating, scene timeline & CTA citations
// ============================================================

import React, { useState } from 'react';
import {
  Film,
  Play,
  Clock,
  Sparkles,
  Zap,
  TrendingUp,
  Target,
  ChevronDown,
  ChevronUp,
  Award,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { VideoPipelineReport } from '@/lib/multimodal/video-pipeline';
import { formatTimestamp } from '@/lib/multimodal/video';

interface VideoAnalysisCardProps {
  report: VideoPipelineReport;
}

export const VideoAnalysisCard: React.FC<VideoAnalysisCardProps> = ({ report }) => {
  const [expanded, setExpanded] = useState(false);
  const { metadata, scenes, analysis, hookGrade, hookFeedback, ctaGrade, ctaFeedback, pacingSummary } = report;

  const getGradeColor = (grade: string) => {
    if (grade === 'A') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    if (grade === 'B') return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    if (grade === 'C') return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    return 'bg-red-500/20 text-red-300 border-red-500/40';
  };

  return (
    <div className="my-3 p-4 rounded-2xl border border-neutral-800 bg-neutral-900/80 backdrop-blur-sm shadow-xl space-y-4 max-w-2xl">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-neutral-100">{report.fileName}</h4>
            <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
              <span>{metadata.format}</span>
              <span>•</span>
              <span>{formatTimestamp(metadata.durationSeconds)} duration</span>
              <span>•</span>
              <span>{scenes.length} scenes</span>
            </div>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-purple-500/10 text-purple-300 border border-purple-500/30">
          Video Intelligence
        </span>
      </div>

      {/* Grades Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Hook Analysis */}
        <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Hook Strength (0–3s)</span>
            </span>
            <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${getGradeColor(hookGrade)}`}>
              Grade {hookGrade}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 leading-relaxed">{hookFeedback}</p>
        </div>

        {/* CTA Timing */}
        <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>CTA Placement</span>
            </span>
            <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${getGradeColor(ctaGrade)}`}>
              Grade {ctaGrade}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 leading-relaxed">{ctaFeedback}</p>
        </div>
      </div>

      {/* Pacing Overview */}
      <div className="p-2.5 rounded-xl bg-neutral-950/40 border border-neutral-800/80 text-[11px] text-neutral-300 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-cyan-400 shrink-0" />
        <span>{pacingSummary}</span>
      </div>

      {/* Scene Timeline Toggle */}
      {scenes.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition"
          >
            <span>{expanded ? 'Hide Scene Timeline' : `View ${scenes.length} Scene Timeline & Visuals`}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {expanded && (
            <div className="space-y-2 pt-1">
              {scenes.map((scene, idx) => (
                <div
                  key={scene.id || idx}
                  className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-200">{scene.title}</span>
                    <span className="font-mono text-[10px] text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                      {formatTimestamp(scene.startSeconds)} – {formatTimestamp(scene.endSeconds)}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">{scene.description}</p>
                  {scene.keyVisuals && scene.keyVisuals.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-1">
                      {scene.keyVisuals.map((v, i) => (
                        <span
                          key={i}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
