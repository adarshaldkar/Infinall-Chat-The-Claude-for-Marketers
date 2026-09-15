import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractSessionFromRequest } from '@/lib/security/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ExportPayloadSchema = z.object({
  artifactId: z.string(),
  title: z.string().min(1),
  type: z.string(),
  content: z.string(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ format: string }> }
) {
  const user = await extractSessionFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  const { format: rawFormat } = await params;
  const format = (rawFormat || 'md').toLowerCase();
  const body = await req.json().catch(() => null);
  const parsed = ExportPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { title, content, type } = parsed.data;
  const safeFilename = encodeURIComponent(title.replace(/[^a-zA-Z0-9_\- ]/g, '_'));

  switch (format) {
    case 'md':
    case 'markdown': {
      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeFilename}.md"`,
        },
      });
    }

    case 'html': {
      const htmlDoc = content.includes('<html')
        ? content
        : `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1e293b; background: #f8fafc; }
    h1, h2, h3 { color: #0f172a; }
    pre { background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; }
    code { font-family: monospace; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #e2e8f0; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div>${content.replace(/\n/g, '<br/>')}</div>
</body>
</html>`;

      return new NextResponse(htmlDoc, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeFilename}.html"`,
        },
      });
    }

    case 'json': {
      const jsonContent = JSON.stringify(
        {
          artifactId: parsed.data.artifactId,
          title,
          type,
          content,
          exportedAt: new Date().toISOString(),
        },
        null,
        2
      );

      return new NextResponse(jsonContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeFilename}.json"`,
        },
      });
    }

    case 'csv':
    case 'xlsx': {
      // Return CSV representation formatted for spreadsheet apps
      const csvContent = content.startsWith('"') || content.includes(',')
        ? content
        : content
            .split('\n')
            .map((line) => line.split('\t').map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
            .join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeFilename}.${format}"`,
        },
      });
    }

    case 'docx': {
      // Clean document envelope for Word / Pages
      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${safeFilename}.docx"`,
        },
      });
    }

    case 'pptx': {
      // Presentation format stream
      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'Content-Disposition': `attachment; filename="${safeFilename}.pptx"`,
        },
      });
    }

    case 'pdf': {
      // PDF stream / text fallback envelope
      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${safeFilename}.pdf"`,
        },
      });
    }

    case 'svg': {
      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeFilename}.svg"`,
        },
      });
    }

    default: {
      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeFilename}.txt"`,
        },
      });
    }
  }
}
