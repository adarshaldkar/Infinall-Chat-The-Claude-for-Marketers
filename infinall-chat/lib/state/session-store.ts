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

export function getStoredSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: ChatSession[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeSession);
  } catch {
    return [];
  }
}

export function saveStoredSessions(sessions: ChatSession[]): void {
  if (typeof window === 'undefined') return;
  try {
    const normalized = sessions.map(normalizeSession);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.error('Failed to persist chat sessions to localStorage', e);
  }
}

export function getActiveSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_SESSION_KEY);
}

export function setActiveSessionId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_SESSION_KEY, id);
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

export async function deleteRemoteSession(id: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const response = await fetch(`/api/sessions?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    return response.ok;
  } catch {
    return false;
  }
}
