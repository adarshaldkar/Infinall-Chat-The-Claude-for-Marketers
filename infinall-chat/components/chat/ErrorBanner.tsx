"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  recoverable: boolean;
  onRetry?: () => void;
}

export default function ErrorBanner({ message, recoverable, onRetry }: ErrorBannerProps) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl border"
      style={{
        background: "rgba(239,68,68,0.08)",
        borderColor: "rgba(239,68,68,0.3)",
      }}
    >
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--color-error)" }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: "var(--color-error)" }}>
          {recoverable ? "Something went wrong" : "Request failed"}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {message}
        </p>
      </div>
      {recoverable && onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0"
          style={{ borderColor: "rgba(239,68,68,0.4)", color: "var(--color-error)" }}
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      )}
    </div>
  );
}
