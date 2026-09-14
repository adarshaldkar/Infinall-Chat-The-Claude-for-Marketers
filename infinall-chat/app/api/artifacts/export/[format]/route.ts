// ============================================================
// Infinall Chat - Binary Artifact Export API Router
// Node.js runtime for high-performance binary compilation
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { DocxBuilder } from '@/lib/artifacts/generators/docx-builder';
import { XlsxBuilder } from '@/lib/artifacts/generators/xlsx-builder';
import { PptxBuilder } from '@/lib/artifacts/generators/pptx-builder';
import { PdfBuilder } from '@/lib/artifacts/generators/pdf-builder';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ format: string }> }
) {
  try {
    const { format } = await params;
    const body = await req.json();
    const { title = 'Infinall_Deliverable', content = '' } = body;

    const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_');

    let binaryBuffer: Buffer;
    let contentType: string;
    let fileExtension: string;

    switch (format.toLowerCase()) {
      case 'docx':
        binaryBuffer = await DocxBuilder.buildDocument({
          title,
          content,
          ...body,
        } as unknown as Parameters<typeof DocxBuilder.buildDocument>[0]);
        contentType =
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        fileExtension = 'docx';
        break;

      case 'xlsx':
        binaryBuffer = await XlsxBuilder.buildWorkbook(content);
        contentType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileExtension = 'xlsx';
        break;

      case 'pptx':
        binaryBuffer = await PptxBuilder.buildPresentation(content);
        contentType =
          'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        fileExtension = 'pptx';
        break;

      case 'pdf':
        binaryBuffer = await PdfBuilder.buildPdf({
          title,
          content: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
        });
        contentType = 'application/pdf';
        fileExtension = 'pdf';
        break;

      case 'md':
      case 'markdown':
        binaryBuffer = Buffer.from(typeof content === 'string' ? content : JSON.stringify(content, null, 2), 'utf-8');
        contentType = 'text/markdown; charset=utf-8';
        fileExtension = 'md';
        break;

      case 'html':
        binaryBuffer = Buffer.from(typeof content === 'string' ? content : JSON.stringify(content, null, 2), 'utf-8');
        contentType = 'text/html; charset=utf-8';
        fileExtension = 'html';
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported export format: ${format}` },
          { status: 400 }
        );
    }

    return new NextResponse(new Uint8Array(binaryBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${safeTitle}.${fileExtension}"`,
        'Content-Length': binaryBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[Export API Error]', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Export failed',
      },
      { status: 500 }
    );
  }
}
