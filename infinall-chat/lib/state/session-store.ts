// ============================================================
// Client-Side Session Store
// Persists chat conversations & artifacts to localStorage
// ============================================================

import { Message, Artifact } from '@/components/workspace/SplitWorkspace';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  artifact: Artifact | null;
  artifacts?: Artifact[];
  isPinned?: boolean;
}

export interface WorkspaceProject {
  id: string;
  name: string;
  instructions: string;
  archived_at?: string | null;
}

const STORAGE_KEY = 'infinall_chat_sessions_v1';
const ACTIVE_SESSION_KEY = 'infinall_active_session_id';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function normalizeSession(session: ChatSession): ChatSession {
  const validSessionId = UUID_REGEX.test(session.id) ? session.id : generateUUID();
  const validMessages = (session.messages || []).map((m) => ({
    ...m,
    id: UUID_REGEX.test(m.id) ? m.id : generateUUID(),
  }));

  return {
    ...session,
    id: validSessionId,
    messages: validMessages,
  };
}

const memoryStore = new Map<string, string>();

function getStorageItem(key: string): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryStore.get(key) ?? null;
    }
  }
  return memoryStore.get(key) ?? null;
}

function setStorageItem(key: string, value: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(key, value);
    } catch {}
  }
  memoryStore.set(key, value);
}

function removeStorageItem(key: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
  memoryStore.delete(key);
}

export function getStoredSessions(): ChatSession[] {
  try {
    const raw = getStorageItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: ChatSession[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeSession);
  } catch {
    return [];
  }
}

export function saveStoredSessions(sessions: ChatSession[]): void {
  try {
    const normalized = sessions.map(normalizeSession);
    setStorageItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.error('Failed to persist chat sessions', e);
  }
}

export function getActiveSessionId(): string | null {
  return getStorageItem(ACTIVE_SESSION_KEY);
}

export function setActiveSessionId(id: string): void {
  setStorageItem(ACTIVE_SESSION_KEY, id);
}

export function createNewSession(initialTitle?: string): ChatSession {
  const newSession: ChatSession = {
    id: generateUUID(),
    title: initialTitle ?? 'New Chat',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    artifact: null,
  };

  const sessions = getStoredSessions();
  saveStoredSessions([newSession, ...sessions]);
  setActiveSessionId(newSession.id);
  
  // Asynchronously persist to Supabase server
  persistRemoteSession(newSession).catch((err) => {
    console.warn('[SessionStore] Remote session create sync failed (using local):', err);
  });

  return newSession;
}

let syncTimeout: NodeJS.Timeout | null = null;

export function updateSession(
  id: string,
  updates: Partial<Pick<ChatSession, 'title' | 'messages' | 'artifact' | 'artifacts' | 'isPinned'>>
): void {
  const sessions = getStoredSessions();
  const index = sessions.findIndex((s) => s.id === id);

  if (index !== -1) {
    const updated: ChatSession = {
      ...sessions[index],
      ...updates,
      updatedAt: Date.now(),
    };
    sessions[index] = updated;
    saveStoredSessions(sessions);

    // Debounced auto-sync to Supabase server
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      persistRemoteSession(updated).catch((err) => {
        console.warn('[SessionStore] Remote session update sync failed:', err);
      });
    }, 600);
  }
}

export function deleteStoredSession(id: string): ChatSession[] {
  const sessions = getStoredSessions().filter((s) => s.id !== id);
  saveStoredSessions(sessions);
  // Delete from remote Supabase server
  deleteRemoteSession(id).catch((err) => {
    console.warn('[SessionStore] Remote session delete sync failed:', err);
  });
  return sessions;
}

export async function loadRemoteSessions(query = ''): Promise<ChatSession[] | null> {
  if (typeof window === 'undefined') return null;
  try {
    const response = await fetch(`/api/sessions${query ? `?q=${encodeURIComponent(query)}` : ''}`);
    if (!response.ok) return null;
    const data = (await response.json()) as { sessions?: ChatSession[] };
    if (!Array.isArray(data.sessions)) return null;
    saveStoredSessions(data.sessions);
    return data.sessions;
  } catch {
    return null;
  }
}

export async function persistRemoteSession(session: ChatSession): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(session),
    });
    return response.ok;
  } catch {
    return false;
  }
}

const ARCHIVED_STORAGE_KEY = 'infinall_archived_sessions_v1';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface ArchivedSessionRecord {
  session: ChatSession;
  archivedAt: number;
  expiresAt: number;
}

export function getArchivedSessions(): ArchivedSessionRecord[] {
  try {
    const raw = getStorageItem(ARCHIVED_STORAGE_KEY);
    if (!raw) return [];
    const parsed: ArchivedSessionRecord[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter out expired (> 30 days)
    const now = Date.now();
    const valid = parsed.filter((r) => r.expiresAt > now);
    if (valid.length !== parsed.length) {
      setStorageItem(ARCHIVED_STORAGE_KEY, JSON.stringify(valid));
    }
    return valid;
  } catch {
    return [];
  }
}

export function archiveAllSessions(): { count: number } {
  const current = getStoredSessions();
  if (current.length === 0) return { count: 0 };

  const now = Date.now();
  const newArchived: ArchivedSessionRecord[] = current.map((s) => ({
    session: s,
    archivedAt: now,
    expiresAt: now + THIRTY_DAYS_MS,
  }));

  const existing = getArchivedSessions();
  setStorageItem(ARCHIVED_STORAGE_KEY, JSON.stringify([...newArchived, ...existing]));
  
  // Clear active sessions
  saveStoredSessions([]);
  removeStorageItem(ACTIVE_SESSION_KEY);

  return { count: current.length };
}

export function restoreArchivedSessions(): { restoredCount: number } {
  const archived = getArchivedSessions();
  if (archived.length === 0) return { restoredCount: 0 };

  const active = getStoredSessions();
  const restoredSessions = archived.map((r) => r.session);
  
  // Merge without duplicates
  const existingIds = new Set(active.map((s) => s.id));
  const newToActive = restoredSessions.filter((s) => !existingIds.has(s.id));
  
  saveStoredSessions([...newToActive, ...active]);
  removeStorageItem(ARCHIVED_STORAGE_KEY);

  if (newToActive.length > 0) {
    setActiveSessionId(newToActive[0].id);
  }

  return { restoredCount: newToActive.length };
}

export function exportAllDataAsJSON(): void {
  if (typeof window === 'undefined') return;
  const active = getStoredSessions();
  const archived = getArchivedSessions();
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    activeSessionsCount: active.length,
    archivedSessionsCount: archived.length,
    sessions: active,
    archivedSessions: archived,
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `infinall_chat_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function deleteRemoteSession(id: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const response = await fetch(`/api/sessions?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    return response.ok;
  } catch {
    return false;
  }
}
