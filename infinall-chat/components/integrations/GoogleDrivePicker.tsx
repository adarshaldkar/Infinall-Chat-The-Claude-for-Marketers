'use client';

// ============================================================
// Infinall Chat - Google Drive File Picker & Ingestion Modal
// Seamless Google Drive folder navigation, file selection & knowledge indexing
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Folder,
  FileText,
  FileSpreadsheet,
  FileCode,
  File,
  Search,
  ChevronRight,
  RefreshCw,
  Check,
  X,
  Sparkles,
  ExternalLink,
  Cloud,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { GoogleDriveFile } from '@/lib/connectors/google-drive';

interface GoogleDrivePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onFileIngested?: (fileName: string, chunks: number) => void;
  currentProjectId?: string;
}

export const GoogleDrivePicker: React.FC<GoogleDrivePickerProps> = ({
  isOpen,
  onClose,
  onFileIngested,
  currentProjectId,
}) => {
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [folderHistory, setFolderHistory] = useState<{ id: string; name: string }[]>([
    { id: 'root', name: 'My Drive' },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [ingestingId, setIngestingId] = useState<string | null>(null);
  const [ingestedMap, setIngestedMap] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async (folderId: string = currentFolderId, query?: string) => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/connectors/google-drive/files?folderId=${folderId}`;
      if (query) url += `&query=${encodeURIComponent(query)}`;

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || data.connected === false) {
        setConnected(false);
        setError(data.error || 'Google Drive is not connected');
        setFiles([]);
      } else {
        setConnected(true);
        setFiles(data.files || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Google Drive files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFiles(currentFolderId);
    }
  }, [isOpen, currentFolderId]);

  if (!isOpen) return null;

  const handleFolderClick = (folder: GoogleDriveFile) => {
    setFolderHistory((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
  };

  const handleBreadcrumbClick = (index: number) => {
    const target = folderHistory[index];
    setFolderHistory((prev) => prev.slice(0, index + 1));
    setCurrentFolderId(target.id);
  };

  const handleIngest = async (file: GoogleDriveFile) => {
    setIngestingId(file.id);
    setError(null);
    try {
      const res = await fetch('/api/connectors/google-drive/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: file.id,
          fileName: file.name,
          mimeType: file.mimeType,
          projectId: currentProjectId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to ingest file');
      }

      const chunks = data.result?.chunkCount || 1;
      setIngestedMap((prev) => ({ ...prev, [file.id]: chunks }));
      onFileIngested?.(file.name, chunks);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIngestingId(null);
    }
  };

  const getFileIcon = (file: GoogleDriveFile) => {
    if (file.isFolder) return <Folder className="w-4 h-4 text-amber-400 fill-amber-400/20" />;
    if (file.mimeType.includes('document')) return <FileText className="w-4 h-4 text-blue-400" />;
    if (file.mimeType.includes('spreadsheet') || file.mimeType.includes('csv'))
      return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    return <File className="w-4 h-4 text-neutral-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-100 text-sm">Google Drive Knowledge Sync</h3>
              <p className="text-xs text-neutral-400">
                Browse and auto-index documents into vector intelligence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Not connected state */}
        {!connected ? (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 rounded-full bg-neutral-800 border border-neutral-700">
              <Cloud className="w-8 h-8 text-neutral-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-neutral-200">Google Drive Not Connected</h4>
              <p className="text-xs text-neutral-400 max-w-sm">
                Connect your Google Drive account in Tools & Integrations to sync brand briefs, docs, sheets, and marketing decks directly.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                window.dispatchEvent(new CustomEvent('open-tools-directory'));
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-500 hover:bg-blue-400 text-neutral-950 transition shadow-lg shadow-blue-500/20"
            >
              Open Integrations
            </button>
          </div>
        ) : (
          <>
            {/* Search and Breadcrumbs */}
            <div className="px-6 py-3 border-b border-neutral-800 bg-neutral-950/40 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1 text-xs text-neutral-400 overflow-x-auto">
                  {folderHistory.map((folder, idx) => (
                    <React.Fragment key={folder.id}>
                      {idx > 0 && <ChevronRight className="w-3 h-3 text-neutral-600 shrink-0" />}
                      <button
                        onClick={() => handleBreadcrumbClick(idx)}
                        className={`hover:text-neutral-200 font-medium whitespace-nowrap ${
                          idx === folderHistory.length - 1 ? 'text-blue-400' : ''
                        }`}
                      >
                        {folder.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>

                <button
                  onClick={() => fetchFiles(currentFolderId, searchQuery)}
                  className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition shrink-0"
                  title="Refresh"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchFiles(currentFolderId, searchQuery)}
                  placeholder="Search files in Google Drive..."
                  className="w-full pl-8 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Error banner if any */}
            {error && (
              <div className="mx-6 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* File List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-neutral-500 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                  <p className="text-xs">Accessing Google Drive...</p>
                </div>
              ) : files.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-500">
                  Folder is empty or no files match search
                </div>
              ) : (
                files.map((file) => {
                  const isIngesting = ingestingId === file.id;
                  const ingestedChunks = ingestedMap[file.id];

                  return (
                    <div
                      key={file.id}
                      className="p-3 rounded-xl border border-neutral-800/80 bg-neutral-900/50 hover:bg-neutral-900 hover:border-neutral-700 transition flex items-center justify-between gap-3 group"
                    >
                      <div
                        onClick={() => file.isFolder && handleFolderClick(file)}
                        className={`flex items-center gap-3 min-w-0 flex-1 ${
                          file.isFolder ? 'cursor-pointer' : ''
                        }`}
                      >
                        {getFileIcon(file)}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-medium text-neutral-200 truncate group-hover:text-neutral-100">
                            {file.name}
                          </h4>
                          {file.modifiedTime && (
                            <span className="text-[10px] text-neutral-500">
                              Modified {new Date(file.modifiedTime).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ingest Action Button */}
                      {!file.isFolder && (
                        <div className="shrink-0 flex items-center gap-2">
                          {ingestedChunks !== undefined ? (
                            <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Indexed ({ingestedChunks} chunks)</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleIngest(file)}
                              disabled={isIngesting}
                              className="px-3 py-1 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-blue-600 text-neutral-200 hover:text-white transition flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {isIngesting ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  <span>Indexing...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3 text-cyan-400" />
                                  <span>Index into AI</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
