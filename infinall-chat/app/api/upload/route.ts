// ============================================================
// Infinall Chat - Multimodal Asset Upload API Router
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { UploadedAttachment, AttachmentKind } from '@/lib/multimodal/types';
import { CreativeVisionAnalyzer } from '@/lib/multimodal/vision';
import { MultimodalDocumentParser } from '@/lib/multimodal/parser';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const mimeType = file.type || 'application/octet-stream';
    const fileName = file.name;
    const sizeBytes = file.size;
    const buffer = Buffer.from(await file.arrayBuffer());

    let kind: AttachmentKind = 'document';
    if (mimeType.startsWith('image/')) {
      kind = 'image';
    } else if (mimeType.startsWith('audio/')) {
      kind = 'audio';
    }

    const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const attachment: UploadedAttachment = {
      id,
      name: fileName,
      kind,
      mimeType,
      sizeBytes,
    };

    if (kind === 'image') {
      attachment.base64Data = `data:${mimeType};base64,${buffer.toString('base64')}`;
      attachment.visionSummary = await CreativeVisionAnalyzer.auditCreativeImage(
        fileName,
        mimeType,
        attachment.base64Data
      );
    } else if (kind === 'document') {
      const parsedDoc = await MultimodalDocumentParser.parseDocument(fileName, buffer);
      attachment.extractedText = parsedDoc.rawText;
    }

    return NextResponse.json({
      success: true,
      attachment,
    });
  } catch (error) {
    console.error('[Upload Error]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
