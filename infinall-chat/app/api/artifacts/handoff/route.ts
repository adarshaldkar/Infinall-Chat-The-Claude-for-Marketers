import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractSessionFromRequest } from '@/lib/security/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getGoogleDriveAccessToken, exportArtifactToGoogleDrive } from '@/lib/connectors/google-drive';
import { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HandoffSchema = z.object({
  action: z.enum(['google_drive', 'approval_center']),
  artifactId: z.string(),
  title: z.string().min(1),
  type: z.string(),
  content: z.string(),
  folderId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await extractSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  
  const parsed = HandoffSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const { action, artifactId, title, type, content, folderId } = parsed.data;
  const supabase = getSupabaseServerClient() as SupabaseClient | null;

  if (action === 'google_drive') {
    try {
      const accessToken = await getGoogleDriveAccessToken(user.userId);
      const exportResult = await exportArtifactToGoogleDrive(accessToken, {
        artifactId,
        title,
        type,
        content,
        folderId,
      });

      return NextResponse.json({
        success: true,
        action: 'google_drive',
        exportResult,
      });
    } catch (err) {
      console.error('[Handoff] Google Drive export error:', err);
      return NextResponse.json({
        error: err instanceof Error ? err.message : 'Google Drive export failed',
      }, { status: 500 });
    }
  }

  if (action === 'approval_center') {
    try {
      if (supabase) {
        const { data: request, error: insErr } = await supabase
          .from('tool_approval_requests')
          .insert({
            user_id: user.userId,
            tool_name: 'artifact_publish',
            status: 'pending',
            risk_level: 'medium',
            arguments: {
              artifactId,
              title,
              type,
              contentLength: content.length,
              preview: content.slice(0, 300),
            },
            context: {
              source: 'artifact_handoff',
              submittedAt: new Date().toISOString(),
            },
          })
          .select('id, status')
          .single();

        if (insErr) {
          console.warn('[Handoff] Could not insert to tool_approval_requests:', insErr.message);
        }

        return NextResponse.json({
          success: true,
          action: 'approval_center',
          requestId: request?.id || `req_${Date.now()}`,
          status: 'pending',
          message: 'Artifact deliverable queued for executive review and approval.',
        });
      }

      return NextResponse.json({
        success: true,
        action: 'approval_center',
        requestId: `req_${Date.now()}`,
        status: 'pending',
        message: 'Artifact deliverable queued for executive review and approval.',
      });
    } catch (err) {
      console.error('[Handoff] Approval Center handoff error:', err);
      return NextResponse.json({
        error: err instanceof Error ? err.message : 'Approval Center handoff failed',
      }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unsupported handoff action' }, { status: 400 });
}

