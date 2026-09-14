// ============================================================
// Infinall Chat - Native PPTX Presentation Deck Generator
// ============================================================

import pptxgen from 'pptxgenjs';
import { PresentationPayload } from '../types';

export class PptxBuilder {
  static async buildPresentation(
    payload: PresentationPayload | string
  ): Promise<Buffer> {
    let parsed: PresentationPayload;

    if (typeof payload === 'string') {
      try {
        parsed = JSON.parse(payload);
      } catch {
        parsed = this.parseMarkdownToSlides(payload);
      }
    } else {
      parsed = payload;
    }

    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    pptx.title = parsed.title;
    pptx.company = 'Infinall Marketing AI';

    const isDark = parsed.theme !== 'light';
    const bg = isDark ? '0f172a' : 'f8fafc';
    const textPrimary = isDark ? 'f8fafc' : '0f172a';
    const textMuted = isDark ? '94a3b8' : '64748b';
    const accent = '22d3ee'; // Cyan brand

    const slides = parsed.slides && parsed.slides.length > 0
      ? parsed.slides
      : [
          {
            title: parsed.title,
            subtitle: 'Marketing Strategy & Growth Plan',
            layout: 'title' as const,
          },
        ];

    for (const slideData of slides) {
      const slide = pptx.addSlide();
      slide.background = { color: bg };

      if (slideData.layout === 'title') {
        // Big centered title
        slide.addText(slideData.title, {
          x: 1.0,
          y: 2.2,
          w: 11.3,
          h: 1.8,
          fontSize: 40,
          bold: true,
          color: textPrimary,
          align: 'center',
          valign: 'middle',
        });

        if (slideData.subtitle) {
          slide.addText(slideData.subtitle, {
            x: 1.5,
            y: 4.2,
            w: 10.3,
            h: 0.8,
            fontSize: 20,
            color: accent,
            align: 'center',
          });
        }
      } else if (slideData.statCards && slideData.statCards.length > 0) {
        // Slide header
        slide.addText(slideData.title, {
          x: 0.8,
          y: 0.6,
          w: 11.7,
          h: 0.8,
          fontSize: 28,
          bold: true,
          color: textPrimary,
        });

        // Stat cards in a row
        const numCards = Math.min(slideData.statCards.length, 4);
        const cardWidth = (11.7 - (numCards - 1) * 0.4) / numCards;

        slideData.statCards.slice(0, 4).forEach((card, idx) => {
          const cardX = 0.8 + idx * (cardWidth + 0.4);

          // Card background container
          slide.addShape(pptx.ShapeType.roundRect, {
            x: cardX,
            y: 1.8,
            w: cardWidth,
            h: 3.8,
            fill: { color: isDark ? '1e293b' : 'ffffff' },
            line: { color: isDark ? '334155' : 'e2e8f0', width: 1 },
          });

          // Stat Value
          slide.addText(card.value, {
            x: cardX + 0.2,
            y: 2.2,
            w: cardWidth - 0.4,
            h: 1.0,
            fontSize: 32,
            bold: true,
            color: accent,
            align: 'center',
          });

          // Stat Label
          slide.addText(card.label, {
            x: cardX + 0.2,
            y: 3.3,
            w: cardWidth - 0.4,
            h: 0.8,
            fontSize: 14,
            bold: true,
            color: textPrimary,
            align: 'center',
          });

          if (card.subtext) {
            slide.addText(card.subtext, {
              x: cardX + 0.2,
              y: 4.1,
              w: cardWidth - 0.4,
              h: 1.0,
              fontSize: 11,
              color: textMuted,
              align: 'center',
            });
          }
        });
      } else {
        // Standard Content Slide with bullets / table
        slide.addText(slideData.title, {
          x: 0.8,
          y: 0.6,
          w: 11.7,
          h: 0.8,
          fontSize: 28,
          bold: true,
          color: textPrimary,
        });

        if (slideData.bulletPoints && slideData.bulletPoints.length > 0) {
          const bullets = slideData.bulletPoints.map((bp) => ({
            text: bp,
            options: { fontSize: 16, color: textPrimary, bullet: true, breakLine: true },
          }));

          slide.addText(bullets, {
            x: 0.8,
            y: 1.6,
            w: 11.7,
            h: 4.8,
            valign: 'top',
          });
        }
      }

      // Speaker notes
      if (slideData.speakerNotes) {
        slide.addNotes(slideData.speakerNotes);
      }
    }

    const buffer = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
    return buffer;
  }

  private static parseMarkdownToSlides(md: string): PresentationPayload {
    const lines = md.split('\n');
    let title = 'Marketing Presentation Deck';
    const slides: PresentationPayload['slides'] = [];
    let currentSlide: PresentationPayload['slides'][0] | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        title = trimmed.replace(/^#\s+/, '');
        slides.push({
          title,
          subtitle: 'Executive Presentation',
          layout: 'title',
        });
      } else if (trimmed.startsWith('## ')) {
        if (currentSlide) slides.push(currentSlide);
        currentSlide = {
          title: trimmed.replace(/^##\s+/, ''),
          bulletPoints: [],
          layout: 'content',
        };
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (!currentSlide) {
          currentSlide = { title: 'Strategic Overview', bulletPoints: [] };
        }
        currentSlide.bulletPoints?.push(trimmed.slice(2));
      }
    }

    if (currentSlide) slides.push(currentSlide);

    return { title, slides };
  }
}
