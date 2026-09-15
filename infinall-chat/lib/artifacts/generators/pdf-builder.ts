// ============================================================
// Infinall Chat - Native PDF Document Compiler
// ============================================================

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface PdfOptions {
  title: string;
  subtitle?: string;
  author?: string;
  content: string;
}

function sanitizeTextForPdf(text: string): string {
  if (!text) return '';
  return text
    .replace(/[—–]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/•/g, '-')
    .replace(/⭐/g, '[*]')
    .replace(/✅/g, '[OK]')
    .replace(/❌/g, '[X]')
    .replace(/⚠️/g, '[!]')
    .replace(/🟢/g, '[+]')
    .replace(/🟡/g, '[~]')
    .replace(/🔴/g, '[-]')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // strip other emojis
    .replace(/[^\x00-\x7F]/g, ''); // strip non-ASCII
}

export class PdfBuilder {
  static async buildPdf(options: PdfOptions | string): Promise<Buffer> {
    const parsed: PdfOptions =
      typeof options === 'string'
        ? { title: 'Marketing Deliverable', content: options }
        : options;

    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageSize: [number, number] = [595.28, 841.89]; // A4 size
    let page = pdfDoc.addPage(pageSize);
    const { width, height } = page.getSize();
    const margin = 48;
    let yPosition = height - margin;

    const cleanTitle = sanitizeTextForPdf(parsed.title || 'Infinall Marketing Brief');

    // Header Title
    page.drawText(cleanTitle.slice(0, 60), {
      x: margin,
      y: yPosition,
      size: 18,
      font: boldFont,
      color: rgb(0.06, 0.09, 0.16),
    });
    yPosition -= 24;

    if (parsed.subtitle) {
      page.drawText(sanitizeTextForPdf(parsed.subtitle), {
        x: margin,
        y: yPosition,
        size: 11,
        font: helveticaFont,
        color: rgb(0.39, 0.45, 0.55),
      });
      yPosition -= 18;
    }

    // Divider Line
    page.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: width - margin, y: yPosition },
      thickness: 1,
      color: rgb(0.85, 0.88, 0.92),
    });
    yPosition -= 25;

    // Content text lines
    const rawContent = parsed.content || '';
    const lines = rawContent.split('\n');

    for (const rawLine of lines) {
      const sanitized = sanitizeTextForPdf(rawLine).trim();

      if (!sanitized) {
        yPosition -= 10;
        continue;
      }

      // Check if page overflow
      if (yPosition < margin + 45) {
        page = pdfDoc.addPage(pageSize);
        yPosition = height - margin;
      }

      if (sanitized.startsWith('# ')) {
        yPosition -= 10;
        page.drawText(sanitized.replace(/^#\s+/, '').slice(0, 70), {
          x: margin,
          y: yPosition,
          size: 15,
          font: boldFont,
          color: rgb(0.06, 0.09, 0.16),
        });
        yPosition -= 20;
      } else if (sanitized.startsWith('## ') || sanitized.startsWith('### ')) {
        yPosition -= 8;
        page.drawText(sanitized.replace(/^#+\s+/, '').slice(0, 75), {
          x: margin,
          y: yPosition,
          size: 12,
          font: boldFont,
          color: rgb(0.12, 0.16, 0.23),
        });
        yPosition -= 16;
      } else if (sanitized.startsWith('|') && sanitized.endsWith('|')) {
        // Table row representation
        if (!sanitized.includes('---')) {
          const cells = sanitized.split('|').map((c) => c.trim()).filter(Boolean);
          const rowText = cells.join('   |   ');
          page.drawText(rowText.slice(0, 85), {
            x: margin,
            y: yPosition,
            size: 8.5,
            font: helveticaFont,
            color: rgb(0.2, 0.25, 0.33),
          });
          yPosition -= 13;
        }
      } else {
        // Regular paragraph or bullet
        const isBullet = sanitized.startsWith('- ') || sanitized.startsWith('* ');
        const cleanBody = sanitized.replace(/^[-*]\s+/, isBullet ? '• ' : '').replace(/\*\*/g, '');
        const words = cleanBody.split(' ');
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const textWidth = helveticaFont.widthOfTextAtSize(testLine, 9.5);

          if (textWidth > width - 2 * margin) {
            if (yPosition < margin + 45) {
              page = pdfDoc.addPage(pageSize);
              yPosition = height - margin;
            }
            page.drawText(currentLine, {
              x: isBullet ? margin + 8 : margin,
              y: yPosition,
              size: 9.5,
              font: helveticaFont,
              color: rgb(0.2, 0.25, 0.33),
            });
            yPosition -= 13;
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }

        if (currentLine) {
          if (yPosition < margin + 45) {
            page = pdfDoc.addPage(pageSize);
            yPosition = height - margin;
          }
          page.drawText(currentLine, {
            x: isBullet ? margin + 8 : margin,
            y: yPosition,
            size: 9.5,
            font: helveticaFont,
            color: rgb(0.2, 0.25, 0.33),
          });
          yPosition -= 13;
        }
      }
    }

    // Add running header, footer, and page numbers
    const totalPages = pdfDoc.getPageCount();
    for (let pIdx = 0; pIdx < totalPages; pIdx++) {
      const p = pdfDoc.getPage(pIdx);
      p.drawText('Infinall Chat - Autonomous Marketing Intelligence', {
        x: margin,
        y: height - 28,
        size: 7.5,
        font: helveticaFont,
        color: rgb(0.5, 0.55, 0.6),
      });
      p.drawText(`Page ${pIdx + 1} of ${totalPages}`, {
        x: width - margin - 50,
        y: 28,
        size: 7.5,
        font: helveticaFont,
        color: rgb(0.5, 0.55, 0.6),
      });
      p.drawText('Confidential & Proprietary Marketing Deliverable', {
        x: margin,
        y: 28,
        size: 7.5,
        font: helveticaFont,
        color: rgb(0.5, 0.55, 0.6),
      });
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
