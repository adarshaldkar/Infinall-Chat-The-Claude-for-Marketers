'use client';

// ============================================================
// Brand Memory Viewer Modal — Full Brand Brain UI Host
// ============================================================

import React from 'react';
import { X } from 'lucide-react';
import { BrandBrainPanel } from './BrandBrainPanel';

interface MemoryViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId?: string;
}

export function MemoryViewerModal({ isOpen, onClose, currentProjectId }: MemoryViewerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-6 animate-in fade-in duration-200">
      <div className="relative bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-5xl h-[88vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Close Button top right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-neutral-900/80 border border-neutral-800 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition"
          title="Close Brand Brain"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Full Brand Brain Panel */}
        <div className="flex-1 h-full overflow-hidden">
          <BrandBrainPanel currentProjectId={currentProjectId} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
