// ============================================================
// /api/connectors/google-drive/files — List & Fetch Google Drive Files
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { extractSessionFromRequest } from '@/lib/security/auth';
import {
  getGoogleDriveAccessToken,
  listGoogleDriveFiles,
  fetchGoogleDriveFileContent,
  ingestGoogleDriveFile,
} from '@/lib/connectors/google-drive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await extractSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get('folderId') || 'root';
  const query = searchParams.get('query') || undefined;

  const accessToken = await getGoogleDriveAccessToken(session.userId);
  if (!accessToken) {
    return NextResponse.json({
      connected: false,
      error: 'Google Drive is not connected or token has expired. Re-authenticate via Integrations.',
      files: [],
    }, { status: 403 });
  }

  const files = await listGoogleDriveFiles(accessToken, folderId, query);
  return NextResponse.json({ connected: true, files });
}

export async function POST(req: NextRequest) {
  const session = await extractSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { fileId, fileName, mimeType, projectId } = body;

    if (!fileId || !fileName || !mimeType) {
      return NextResponse.json(
        { error: 'Missing required parameters: fileId, fileName, mimeType' },
        { status: 400 }
      );
    }

    const accessToken = await getGoogleDriveAccessToken(session.userId);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Google Drive is not connected or authorization expired' },
        { status: 403 }
      );
    }

    // Download / export content
    const contentData = await fetchGoogleDriveFileContent(accessToken, fileId, mimeType);
    if (!contentData || !contentData.text) {
      return NextResponse.json(
        { error: 'Could not extract text content from the selected Google Drive file' },
        { status: 422 }
      );
    }

    // Ingest into pgvector knowledge base
    const syncResult = await ingestGoogleDriveFile(
      session.userId,
      projectId,
      fileId,
      fileName,
      contentData.text
    );

    return NextResponse.json({ success: true, result: syncResult });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
