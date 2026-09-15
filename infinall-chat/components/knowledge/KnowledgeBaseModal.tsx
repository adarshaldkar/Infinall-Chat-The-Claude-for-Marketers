'use client';

// ============================================================
// Knowledge Base Modal: Universal Multi-Format Document Ingestion
// Scoped by Project / Brand Brain with Real-Time SSE Ingestion Telemetry
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileSpreadsheet,
  Presentation,
  BookOpen,
  Layers,
  Search,
  Trash2,
} from 'lucide-react';

interface KnowledgeDoc {
  id: string;
  projectId?: string;
  title: string;
  fileType: string;
  fileSizeBytes: number;
  pageCount: number;
  chunkCount: number;
  status: string;
  createdAt: string;
}

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

export function KnowledgeBaseModal({ isOpen, onClose, projectId }: KnowledgeBaseModalProps) {
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeEventSourceRef = useRef<EventSource | null>(null);

  const documentsUrl = () => projectId
        ? `/api/knowledge/documents?projectId=${projectId}`
        : '/api/knowledge/documents';

  const loadDocuments = async () => {
    try {
      const res = await fetch(documentsUrl());
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (_) {}
    setLoading(false);
  };

  const fetchDocuments = async () => {
    setLoading(true);
    await loadDocuments();
  };

  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen && !wasOpen) {
    setWasOpen(true);
    setLoading(true);
  }
  if (!isOpen && wasOpen) {
    setWasOpen(false);
  }

  useEffect(() => {
    if (!isOpen) return;
    fetch(documentsUrl())
      .then(res => res.ok ? res.json() : { documents: [] })
      .then(data => setDocuments(data.documents || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => {
      if (activeEventSourceRef.current) {
        activeEventSourceRef.current.close();
      }
    };
  }, [isOpen, projectId]);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setProgressPct(5);
    setUploadStatus(`Uploading ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (projectId) {
        formData.append('projectId', projectId);
      }

      const res = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      const docId = data.document?.id;

      if (!docId) {
        setUploadStatus(`✅ ${file.name} uploaded successfully!`);
        setTimeout(() => {
          setUploading(false);
          setUploadStatus('');
          fetchDocuments();
        }, 1200);
        return;
      }

      // Connect to real SSE stream for live progress
      const eventSource = new EventSource(`/api/knowledge/stream?docId=${docId}`);
      activeEventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setProgressPct(payload.progressPct || 0);
          setUploadStatus(payload.message || `Status: ${payload.status}`);

          if (payload.status === 'ready') {
            eventSource.close();
            activeEventSourceRef.current = null;
            setTimeout(() => {
              setUploading(false);
              setProgressPct(0);
              setUploadStatus('');
              fetchDocuments();
            }, 1000);
          } else if (payload.status === 'failed') {
            eventSource.close();
            activeEventSourceRef.current = null;
            setUploadStatus(`❌ Ingestion failed: ${payload.error || payload.message}`);
            setTimeout(() => {
              setUploading(false);
              setProgressPct(0);
            }, 4000);
          }
        } catch (_) {}
      };

      eventSource.onerror = () => {
        eventSource.close();
        activeEventSourceRef.current = null;
        // Fallback check
        setTimeout(() => {
          fetchDocuments();
          setUploading(false);
          setProgressPct(0);
          setUploadStatus('');
        }, 2000);
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadStatus(`❌ Error: ${msg}`);
      setTimeout(() => {
        setUploading(false);
        setProgressPct(0);
      }, 3500);
    }
  };

  const getFormatIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return <BookOpen className="w-5 h-5 text-red-400" />;
      case 'xlsx':
      case 'csv':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
      case 'pptx':
      case 'ppt':
        return <Presentation className="w-5 h-5 text-amber-400" />;
      case 'docx':
      case 'doc':
        return <FileText className="w-5 h-5 text-blue-400" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  if (!isOpen) return null;

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
                Knowledge Base & VectorDB
                {projectId && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium border border-purple-500/30">
                    Project Scoped
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-400">
                Ground AI responses in your verified marketing documents, decks, CSVs & guidelines.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Dropzone */}
        <div className="p-6 border-b border-neutral-800 bg-neutral-950/30">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.csv,.md,.txt,.json,.html"
            className="hidden"
          />

          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition cursor-pointer ${
              uploading
                ? 'border-purple-500/50 bg-purple-500/5 cursor-wait'
                : 'border-neutral-700 hover:border-purple-500/50 hover:bg-neutral-800/40'
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3 w-full max-w-md">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                <p className="text-sm font-medium text-neutral-200">{uploadStatus}</p>
                {/* Real SSE Progress Bar */}
                <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${Math.max(5, progressPct)}%` }}
                  />
                </div>
                <span className="text-xs text-neutral-500">{progressPct}% completed</span>
              </div>
            ) : (
              <>
                <div className="p-3 rounded-full bg-neutral-800/80 mb-3 text-neutral-300">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-neutral-200 mb-1">
                  Click to upload or drag & drop marketing documents
                </p>
                <p className="text-xs text-neutral-400 mb-3">
                  PDF, DOCX, PPTX, XLSX, CSV, Markdown, TXT, JSON (Max 50MB)
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-neutral-400">
                  <span className="px-2 py-0.5 rounded bg-neutral-800">📄 Multi-page PDF</span>
                  <span className="px-2 py-0.5 rounded bg-neutral-800">📊 Spreadsheets & CSV</span>
                  <span className="px-2 py-0.5 rounded bg-neutral-800">📑 Brand Decks</span>
                  <span className="px-2 py-0.5 rounded bg-neutral-800">⚡ 1536-d HNSW VectorDB</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Search & Document List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search indexed knowledge documents..."
                className="w-full pl-9 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <span className="text-xs text-neutral-400 font-medium">
              {filteredDocs.length} {filteredDocs.length === 1 ? 'document' : 'documents'}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-neutral-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs">Loading VectorDB catalog...</span>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-xs">
              {searchQuery ? 'No documents match your search.' : 'No documents uploaded yet. Add brand guides or data above.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3.5 bg-neutral-950/60 border border-neutral-800/80 rounded-xl hover:border-neutral-700 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                      {getFormatIcon(doc.fileType)}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-200">{doc.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400">
                        <span>{(doc.fileSizeBytes / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span>{doc.pageCount || 1} {doc.pageCount === 1 ? 'page' : 'pages'}</span>
                        <span>•</span>
                        <span>{doc.chunkCount || 0} vector chunks</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      Indexed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
