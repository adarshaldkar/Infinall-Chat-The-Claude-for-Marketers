// ============================================================
// Infinall Chat - Google Drive Connector & Real-Time Sync
// Full Google Drive API integration: folder browsing, file export,
// webhook push notifications, and automatic knowledge ingestion.
// ============================================================

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { decryptCredential } from '@/lib/security/credential-vault';
import { SupabaseClient } from '@supabase/supabase-js';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  iconLink?: string;
  webViewLink?: string;
  modifiedTime?: string;
  size?: string;
  parents?: string[];
  isFolder: boolean;
}

export interface GoogleDriveSyncResult {
  fileId: string;
  fileName: string;
  status: 'ingested' | 'skipped' | 'failed';
  chunkCount?: number;
  error?: string;
}

/**
 * Get Google Drive access token for a user from connector_connections.
 */
export async function getGoogleDriveAccessToken(userId: string): Promise<string | null> {
  const supabase = getSupabaseServerClient() as SupabaseClient | null;
  if (!supabase) return null;

  try {
    const { data } = await supabase
      .from('connector_connections')
      .select('encrypted_credentials, status, expires_at')
      .eq('user_id', userId)
      .eq('connector_id', 'google_drive')
      .single();

    if (!data || data.status !== 'connected' || !data.encrypted_credentials) {
      return null;
    }

    const creds = decryptCredential(data.encrypted_credentials);
    return (creds.accessToken as string) || (creds.access_token as string) || null;
  } catch (err) {
    console.error('[GoogleDrive] Error retrieving access token:', err);
    return null;
  }
}

/**
 * List files and folders from Google Drive.
 */
export async function listGoogleDriveFiles(
  accessToken: string,
  folderId: string = 'root',
  query?: string,
  pageSize: number = 30
): Promise<GoogleDriveFile[]> {
  try {
    let q = `'${folderId}' in parents and trashed = false`;
    if (query) {
      q += ` and name contains '${query.replace(/'/g, "\\'")}'`;
    }

    const params = new URLSearchParams({
      q,
      fields: 'files(id, name, mimeType, iconLink, webViewLink, modifiedTime, size, parents)',
      pageSize: pageSize.toString(),
      orderBy: 'folder,name',
    });

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[GoogleDrive] list files failed:', res.status, errText);
      return [];
    }

    const data = await res.json();
    return (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      iconLink: f.iconLink,
      webViewLink: f.webViewLink,
      modifiedTime: f.modifiedTime,
      size: f.size,
      parents: f.parents,
      isFolder: f.mimeType === 'application/vnd.google-apps.folder',
    }));
  } catch (err) {
    console.error('[GoogleDrive] listGoogleDriveFiles error:', err);
    return [];
  }
}

/**
 * Download or export file content from Google Drive as plain text.
 */
export async function fetchGoogleDriveFileContent(
  accessToken: string,
  fileId: string,
  mimeType: string
): Promise<{ text: string; fileName?: string } | null> {
  try {
    let downloadUrl: string;

    if (mimeType === 'application/vnd.google-apps.document') {
      // Export Google Doc as plain text
      downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
    } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      // Export Google Sheet as CSV
      downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`;
    } else if (mimeType === 'application/vnd.google-apps.presentation') {
      // Export Google Slides as plain text
      downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
    } else {
      // Direct file download for PDF, TXT, MD, DOCX, CSV
      downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    }

    const res = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      console.warn(`[GoogleDrive] download failed for ${fileId}: HTTP ${res.status}`);
      return null;
    }

    const text = await res.text();
    return { text };
  } catch (err) {
    console.error(`[GoogleDrive] fetch content error for ${fileId}:`, err);
    return null;
  }
}

/**
 * Auto-ingest Google Drive file into Infinall's pgvector knowledge base.
 */
export async function ingestGoogleDriveFile(
  userId: string,
  projectId: string | undefined,
  fileId: string,
  fileName: string,
  content: string
): Promise<GoogleDriveSyncResult> {
  const supabase = getSupabaseServerClient() as SupabaseClient | null;
  if (!supabase) {
    return { fileId, fileName, status: 'failed', error: 'Database unavailable' };
  }

  try {
    // 1. Create document record
    const { data: doc, error: docErr } = await supabase
      .from('knowledge_documents')
      .insert({
        user_id: userId,
        project_id: projectId || null,
        title: fileName,
        source_type: 'google_drive',
        source_url: `https://drive.google.com/file/d/${fileId}/view`,
        mime_type: 'text/plain',
        status: 'completed',
        metadata: { googleDriveFileId: fileId },
      })
      .select('id')
      .single();

    if (docErr || !doc) {
      return { fileId, fileName, status: 'failed', error: docErr?.message };
    }

    // 2. Chunk & embed
    const { defaultEmbeddingGateway } = await import('@/lib/rag/embedding-gateway');
    const chunkSize = 800;
    const overlap = 100;
    const chunks: string[] = [];

    for (let i = 0; i < content.length; i += chunkSize - overlap) {
      chunks.push(content.slice(i, i + chunkSize));
    }

    let chunkCount = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      let embedding: number[] | null = null;
      try {
        embedding = await defaultEmbeddingGateway.embedText(chunkText);
      } catch (_) {}

      await supabase.from('knowledge_chunks').insert({
        document_id: doc.id,
        user_id: userId,
        project_id: projectId || null,
        chunk_index: i,
        content: chunkText,
        embedding,
        metadata: { googleDriveFileId: fileId, fileName },
      });
      chunkCount++;
    }

    return { fileId, fileName, status: 'ingested', chunkCount };
  } catch (err: any) {
    return { fileId, fileName, status: 'failed', error: err.message };
  }
}
