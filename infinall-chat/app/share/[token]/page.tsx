'use client';

// ============================================================
// /share/[token] — Public Read-Only Conversation Viewer
// Allows teammates and clients to view shared marketing chats & artifacts
// ============================================================

import React, { useEffect, useState, use } from 'react';
import { Loader2, Sparkles, Brain, Clock, ShieldCheck, Share2 } from 'lucide-react';
import Link from 'next/link';

interface SharedSession {
  id: string;
  title: string;
  created_at: string;
  chat_messages: Array<{
    id: string;
    role: string;
    content: string | { content?: string; [key: string]: unknown };
    thinking?: string;
    created_at: string;
  }>;
  doc_artifacts?: Array<{
    id: string;
    title: string;
    type: string;
    content: string;
  }>;
}

export default function SharedSessionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [session, setSession] = useState<SharedSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSharedSession() {
      try {
        const res = await fetch(`/api/sessions/share?token=${token}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load shared conversation');
        }
        const data = await res.json();
        setSession(data.session);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    loadSharedSession();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-200 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-sm font-medium text-neutral-400">Loading shared conversation...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-200 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mb-3">
          <Share2 className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold text-neutral-100 mb-1">Unable to View Shared Conversation</h1>
        <p className="text-xs text-neutral-400 max-w-sm mb-6">{error || 'This link may have expired or been revoked.'}</p>
        <Link
          href="/"
          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-medium transition"
        >
          Return to Workspace
        </Link>
      </div>
    );
  }

  const messages = session.chat_messages || [];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 flex flex-col">
      {/* Header Banner */}
      <header className="px-6 py-4 border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              {session.title || 'Marketing Strategy Session'}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                Read-Only
              </span>
            </h1>
            <p className="text-[11px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3 h-3" />
              Shared on {new Date(session.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-medium transition shadow-lg shadow-cyan-500/20"
        >
          Open Infinall Chat
        </Link>
      </header>

      {/* Messages Stream */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-6 space-y-6">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const contentStr =
            typeof msg.content === 'object'
              ? msg.content?.content || JSON.stringify(msg.content)
              : msg.content;

          return (
            <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-tr-sm'
                    : 'bg-neutral-900/40 border border-neutral-800/60 text-neutral-200 rounded-tl-sm'
                }`}
              >
                {/* Assistant Header */}
                {!isUser && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-neutral-800/50 text-[11px] font-medium text-cyan-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    Infinall AI
                  </div>
                )}

                {/* Thinking / Reasoning Block */}
                {msg.thinking && (
                  <div className="mb-3 p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800 text-xs font-mono text-neutral-400">
                    <div className="flex items-center gap-1.5 text-neutral-300 font-sans text-[11px] mb-1 font-semibold">
                      <Brain className="w-3 h-3 text-purple-400" />
                      Reasoning Trace
                    </div>
                    <div className="whitespace-pre-wrap">{msg.thinking}</div>
                  </div>
                )}

                <div className="whitespace-pre-wrap">{contentStr}</div>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
