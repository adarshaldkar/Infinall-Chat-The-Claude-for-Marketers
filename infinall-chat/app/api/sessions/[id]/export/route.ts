// ============================================================
// /api/sessions/[id]/export — One-Click Conversation Export Endpoint
// Exports chat history to Markdown, JSON, or PDF-ready formatted HTML
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { extractSessionFromRequest } from '@/lib/security/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await extractSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
    }

    const { id: sessionId } = await params;
    const { searchParams } = new URL(req.url);
    const format = (searchParams.get('format') || 'markdown').toLowerCase();

    const supabase = getSupabaseServerClient() as SupabaseClient | null;
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Fetch session details
    const { data: chatSession, error: sessionErr } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionErr || !chatSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Fetch messages
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    // Fetch artifacts
    const { data: artifacts } = await supabase
      .from('doc_artifacts')
      .select('*')
      .eq('session_id', sessionId);

    const messageList = messages || [];
    const artifactList = artifacts || [];

    // ── 1. MARKDOWN EXPORT ─────────────────────────────────────
    if (format === 'markdown' || format === 'md') {
      let md = `# ${chatSession.title || 'Infinall Marketing Chat Session'}\n\n`;
      md += `*Exported on ${new Date().toLocaleDateString('en-US', { dateStyle: 'full', timeStyle: 'short' })}*\n\n---\n\n`;

      for (const msg of messageList) {
        const roleName = msg.role === 'user' ? '👤 **Marketer**' : '🤖 **Infinall AI**';
        const rawContent = typeof msg.content === 'object' ? msg.content?.content || JSON.stringify(msg.content) : msg.content;
        md += `### ${roleName}\n\n${rawContent}\n\n`;

        if (msg.thinking) {
          md += `> **Extended Reasoning:**\n> ${msg.thinking.replace(/\n/g, '\n> ')}\n\n`;
        }

        md += `---\n\n`;
      }

      if (artifactList.length > 0) {
        md += `## 📦 Generated Artifacts & Deliverables\n\n`;
        for (const art of artifactList) {
          md += `### ${art.title} (${art.type})\n\n\`\`\`${art.language || 'text'}\n${art.content}\n\`\`\`\n\n`;
        }
      }

      return new Response(md, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(chatSession.title || 'chat')}.md"`,
        },
      });
    }

    // ── 2. JSON EXPORT ─────────────────────────────────────────
    if (format === 'json') {
      return NextResponse.json({
        session: chatSession,
        messages: messageList,
        artifacts: artifactList,
        exportedAt: new Date().toISOString(),
      });
    }

    // ── 3. HTML / PDF PRINT-READY EXPORT ───────────────────────
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${chatSession.title || 'Infinall Marketing Chat'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1 { font-size: 24px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 8px; }
    .meta { font-size: 13px; color: #64748b; margin-bottom: 30px; }
    .message { margin-bottom: 24px; padding: 16px 20px; border-radius: 12px; }
    .user { background: #f1f5f9; border-left: 4px solid #3b82f6; }
    .assistant { background: #faf5ff; border-left: 4px solid #8b5cf6; }
    .role { font-weight: 600; font-size: 13px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .user .role { color: #2563eb; }
    .assistant .role { color: #7c3aed; }
    .content { white-space: pre-wrap; font-size: 14px; }
    .artifact { background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 13px; overflow-x: auto; margin-top: 12px; }
  </style>
</head>
<body>
  <h1>${chatSession.title || 'Infinall Marketing Conversation'}</h1>
  <div class="meta">Exported from Infinall Chat on ${new Date().toLocaleDateString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</div>
`;

    for (const msg of messageList) {
      const isUser = msg.role === 'user';
      const rawContent = typeof msg.content === 'object' ? msg.content?.content || JSON.stringify(msg.content) : msg.content;
      html += `  <div class="message ${isUser ? 'user' : 'assistant'}">
    <div class="role">${isUser ? 'Marketer' : 'Infinall AI'}</div>
    <div class="content">${escapeHtml(rawContent)}</div>
  </div>\n`;
    }

    html += `</body>\n</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
