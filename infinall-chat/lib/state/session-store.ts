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
}

const STORAGE_KEY = 'infinall_chat_sessions_v1';
const ACTIVE_SESSION_KEY = 'infinall_active_session_id';

export function getStoredSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredSessions(sessions: ChatSession[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
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
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: initialTitle ?? 'New Chat',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    artifact: null,
  };

  const sessions = getStoredSessions();
  saveStoredSessions([newSession, ...sessions]);
  setActiveSessionId(newSession.id);
  return newSession;
}

export function updateSession(
  id: string,
  updates: Partial<Pick<ChatSession, 'title' | 'messages' | 'artifact'>>
): void {
  const sessions = getStoredSessions();
  const index = sessions.findIndex((s) => s.id === id);

  if (index !== -1) {
    sessions[index] = {
      ...sessions[index],
      ...updates,
      updatedAt: Date.now(),
    };
    saveStoredSessions(sessions);
  }
}

export function deleteStoredSession(id: string): ChatSession[] {
  const sessions = getStoredSessions().filter((s) => s.id !== id);
  saveStoredSessions(sessions);
  return sessions;
}
