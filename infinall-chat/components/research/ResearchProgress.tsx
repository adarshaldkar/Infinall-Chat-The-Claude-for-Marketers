'use client';

// ============================================================
// Infinall Chat - Deep Autonomous Research Progress Component
// Renders live background research status, execution tree, and citations
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Globe,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  BookOpen,
  RefreshCw,
  Search
} from 'lucide-react';

interface ResearchProgressProps {
  jobId: string;
  onComplete?: (results: any) => void;
}

export const ResearchProgress: React.FC<ResearchProgressProps> = ({ jobId, onComplete }) => {
  const [status, setStatus] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/research/${jobId}/status`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data);

          if (data.status === 'completed') {
            setPolling(false);
            clearInterval(interval);
            // Fetch results
            const resResults = await fetch(`/api/research/${jobId}/results`);
            if (resResults.ok) {
              const resData = await resResults.json();
              setResults(resData.results);
              onComplete?.(resData.results);
            }
          } else if (data.status === 'failed') {
            setPolling(false);
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Failed to poll research job:', err);
      }
    };

    checkStatus();
    interval = setInterval(checkStatus, 2000);

    return () => clearInterval(interval);
  }, [jobId, onComplete]);

  return (
    <div className="my-3 p-4 rounded-2xl border border-neutral-800 bg-neutral-900/80 backdrop-blur-sm shadow-xl space-y-3 max-w-2xl">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-neutral-100">Autonomous Deep Research</h4>
            <p className="text-[10px] text-neutral-400 font-mono">Job ID: {jobId}</p>
          </div>
        </div>

        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
            status?.status === 'completed'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : status?.status === 'failed'
              ? 'bg-red-500/10 text-red-300 border-red-500/30'
              : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 animate-pulse'
          }`}
        >
          {status?.status || 'Initiating'}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-neutral-400">
          <span className="flex items-center gap-1.5">
            {polling && <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />}
            <span>{status?.currentStep || 'Initializing subagent swarm...'}</span>
          </span>
          <span className="font-mono text-cyan-300 font-bold">{status?.progressPercent || 10}%</span>
        </div>

        <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
            style={{ width: `${status?.progressPercent || 10}%` }}
          />
        </div>
      </div>

      {/* Results View when completed */}
      {results && (
        <div className="mt-3 pt-3 border-t border-neutral-800 space-y-3">
          <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-xs text-neutral-200 space-y-2">
            <h5 className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Synthesized Research Insights</span>
            </h5>
            <p className="text-[11px] text-neutral-300 leading-relaxed font-sans">{results.summary}</p>
          </div>

          {results.sources && results.sources.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                <Globe className="w-3 h-3 text-cyan-400" />
                <span>Verified Sources ({results.sources.length})</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {results.sources.map((src: any, i: number) => (
                  <a
                    key={i}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-[11px] text-neutral-300 hover:text-cyan-300 transition flex items-center justify-between gap-2 truncate"
                  >
                    <span className="truncate">{src.title}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 text-neutral-500" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
