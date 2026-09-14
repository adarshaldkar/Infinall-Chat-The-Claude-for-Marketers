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

export class PdfBuilder {
  static async buildPdf(options: PdfOptions | string): Promise<Buffer> {
    const parsed: PdfOptions =
      typeof options === 'string'
        ? { title: 'Marketing Deliverable', content: options }
        : options;

    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageSize: [number, number] = [595.28, 841.89]; // A4 size
    let page = pdfDoc.addPage(pageSize);
    const { width, height } = page.getSize();
    const margin = 50;
    let yPosition = height - margin;

    // Header Title
    page.drawText(parsed.title, {
      x: margin,
      y: yPosition,
      size: 20,
      font: boldFont,
      color: rgb(0.06, 0.09, 0.16),
    });
    yPosition -= 26;

    if (parsed.subtitle) {
      page.drawText(parsed.subtitle, {
        x: margin,
        y: yPosition,
        size: 12,
        font: timesRomanFont,
        color: rgb(0.39, 0.45, 0.55),
      });
      yPosition -= 20;
    }

    // Divider Line
    page.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: width - margin, y: yPosition },
      thickness: 1,
      color: rgb(0.88, 0.91, 0.94),
    });
    yPosition -= 30;

    // Content text lines
    const lines = parsed.content.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        yPosition -= 12;
        continue;
      }

      // Check if page overflow
      if (yPosition < margin + 40) {
        page = pdfDoc.addPage(pageSize);
        yPosition = height - margin;
      }

      if (line.startsWith('# ')) {
        yPosition -= 8;
        page.drawText(line.replace(/^#\s+/, ''), {
          x: margin,
          y: yPosition,
          size: 16,
          font: boldFont,
          color: rgb(0.06, 0.09, 0.16),
        });
        yPosition -= 22;
      } else if (line.startsWith('## ') || line.startsWith('### ')) {
        yPosition -= 6;
        page.drawText(line.replace(/^#+\s+/, ''), {
          x: margin,
          y: yPosition,
          size: 13,
          font: boldFont,
          color: rgb(0.12, 0.16, 0.23),
        });
        yPosition -= 18;
      } else {
        // Simple word wrap
        const words = line.split(' ');
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const textWidth = timesRomanFont.widthOfTextAtSize(testLine, 10);

          if (textWidth > width - 2 * margin) {
            if (yPosition < margin + 40) {
              page = pdfDoc.addPage(pageSize);
              yPosition = height - margin;
            }
            page.drawText(currentLine, {
              x: margin,
              y: yPosition,
              size: 10,
              font: timesRomanFont,
              color: rgb(0.2, 0.25, 0.33),
            });
            yPosition -= 14;
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }

        if (currentLine) {
          if (yPosition < margin + 40) {
            page = pdfDoc.addPage(pageSize);
            yPosition = height - margin;
          }
          page.drawText(currentLine, {
            x: margin,
            y: yPosition,
            size: 10,
            font: timesRomanFont,
            color: rgb(0.2, 0.25, 0.33),
          });
          yPosition -= 14;
        }
      }
    }

    // Add running header, footer, and page numbers to all pages
    const totalPages = pdfDoc.getPageCount();
    for (let pIdx = 0; pIdx < totalPages; pIdx++) {
      const p = pdfDoc.getPage(pIdx);
      // Running header
      p.drawText('Infinall Chat — Autonomous Marketing Intelligence', {
        x: margin,
        y: height - 30,
        size: 8,
        font: timesRomanFont,
        color: rgb(0.5, 0.55, 0.6),
      });
      // Running footer with page numbering
      p.drawText(`Page ${pIdx + 1} of ${totalPages}`, {
        x: width - margin - 55,
        y: 30,
        size: 8,
        font: timesRomanFont,
        color: rgb(0.5, 0.55, 0.6),
      });
      p.drawText('Confidential & Proprietary Marketing Deliverable', {
        x: margin,
        y: 30,
        size: 8,
        font: timesRomanFont,
        color: rgb(0.5, 0.55, 0.6),
      });
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
