"use client";

import { UploadedAttachment } from "@/lib/multimodal/types";
import { Image as ImageIcon, FileText, X, Sparkles } from "lucide-react";

interface AttachmentPreviewBarProps {
  attachments: UploadedAttachment[];
  onRemoveAttachment: (id: string) => void;
}

export default function AttachmentPreviewBar({
  attachments,
  onRemoveAttachment,
}: AttachmentPreviewBarProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex items-center gap-2 p-2 px-3 border-b border-zinc-800/80 bg-zinc-900/40 overflow-x-auto">
      {attachments.map((att) => {
        const isImage = att.kind === "image";

        return (
          <div
            key={att.id}
            className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 shrink-0 group animate-in fade-in"
          >
            {isImage && att.base64Data ? (
              <img
                src={att.base64Data}
                alt={att.name}
                className="w-5 h-5 rounded object-cover border border-zinc-700"
              />
            ) : isImage ? (
              <ImageIcon className="w-4 h-4 text-cyan-400" />
            ) : (
              <FileText className="w-4 h-4 text-blue-400" />
            )}

            <div className="flex flex-col">
              <span className="font-medium text-xs max-w-[140px] truncate">{att.name}</span>
              {att.visionSummary && (
                <span className="text-[10px] text-cyan-400 flex items-center gap-1 font-mono">
                  <Sparkles className="w-2.5 h-2.5" />
                  Hook Score: {att.visionSummary.headlineHookScore}/10
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => onRemoveAttachment(att.id)}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
