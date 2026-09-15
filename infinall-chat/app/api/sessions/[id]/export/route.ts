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
  const session = await extractSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  const { id } = await params;
  const format = new URL(req.url).searchParams.get('format')?.toLowerCase() || 'md';

  const supabase = getSupabaseServerClient() as SupabaseClient | null;
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  const { data: chatSession, error: sessErr } = await supabase
    .from('chat_sessions')
    .select('id, title, created_at, updated_at, user_id')
    .eq('id', id)
    .maybeSingle();

  if (sessErr || !chatSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', id)
    .order('created_at', { ascending: true });

  const safeTitle = (chatSession.title || 'Infinall_Conversation').replace(/[^a-zA-Z0-9_\- ]/g, '_');

  if (format === 'json') {
    return new NextResponse(
      JSON.stringify(
        {
          session: chatSession,
          messages: messages || [],
          exportedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(safeTitle)}.json"`,
        },
      }
    );
  }

  // Format as readable Markdown transcript
  const lines: string[] = [
    `# ${chatSession.title || 'Infinall Chat Conversation'}`,
    `_Exported from Infinall Chat on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}_`,
    '',
    '---',
    '',
  ];

  for (const m of messages || []) {
    const roleName = m.role === 'assistant' ? '🤖 Infinall Agent' : '👤 Marketer';
    const timeStr = m.created_at ? new Date(m.created_at).toLocaleTimeString() : '';
    lines.push(`### ${roleName} ${timeStr ? `(${timeStr})` : ''}`);

    let textContent = '';
    if (typeof m.content === 'string') {
      textContent = m.content;
    } else if (m.content && typeof m.content === 'object') {
      const obj = m.content as Record<string, any>;
      textContent = obj.content || obj.text || JSON.stringify(obj, null, 2);
    }

    if (m.thinking) {
      lines.push('<details>');
      lines.push('<summary>🧠 Agent Reasoning Trace</summary>\n');
      lines.push(m.thinking);
      lines.push('</details>\n');
    }

    lines.push(textContent);
    lines.push('\n---\n');
  }

  const mdContent = lines.join('\n');

  return new NextResponse(mdContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(safeTitle)}.md"`,
    },
  });
}
