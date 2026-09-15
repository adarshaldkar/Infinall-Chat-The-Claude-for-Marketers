// ============================================================
// Infinall Chat - Premium Native PPTX Presentation Deck Generator
// Generates Executive 16:9 Slide Decks with Tables, Callouts & Cards
// ============================================================

import pptxgen from 'pptxgenjs';

interface ParsedSlide {
  title: string;
  subtitle?: string;
  layout?: 'title' | 'content' | 'split' | 'table' | 'stats' | 'timeline';
  bulletPoints?: string[];
  callout?: string;
  table?: {
    headers: string[];
    rows: string[][];
  };
  statCards?: Array<{ value: string; label: string; subtext?: string }>;
  speakerNotes?: string;
}

function cleanMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .trim();
}

export class PptxBuilder {
  static async buildPresentation(
    payload: any
  ): Promise<Buffer> {
    let title = 'Strategic Intelligence Brief';
    let slides: ParsedSlide[] = [];

    if (typeof payload === 'string') {
      try {
        const parsed = JSON.parse(payload);
        if (parsed.slides && Array.isArray(parsed.slides)) {
          title = parsed.title || title;
          slides = parsed.slides;
        } else {
          const fromMd = this.parseMarkdownToDeck(payload);
          title = fromMd.title;
          slides = fromMd.slides;
        }
      } catch {
        const fromMd = this.parseMarkdownToDeck(payload);
        title = fromMd.title;
        slides = fromMd.slides;
      }
    } else if (payload && typeof payload === 'object') {
      if (payload.slides && Array.isArray(payload.slides) && payload.slides.length > 0) {
        title = payload.title || title;
        slides = payload.slides;
      } else if (payload.content) {
        const fromMd = this.parseMarkdownToDeck(payload.content, payload.title);
        title = fromMd.title;
        slides = fromMd.slides;
      } else {
        title = payload.title || title;
        slides = [
          {
            title,
            subtitle: 'Marketing Strategy & Intelligence Brief',
            layout: 'title',
          },
        ];
      }
    }

    if (slides.length === 0) {
      slides = [
        {
          title,
          subtitle: 'Executive Presentation Deck',
          layout: 'title',
        },
      ];
    }

    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    pptx.title = title;
    pptx.company = 'Infinall AI — The Claude for Marketers';

    // Theme Colors (Modern Slate & Cyan Executive Dark Theme)
    const bgDark = '0B132B';
    const cardBg = '1C2541';
    const accentCyan = '00E5FF';
    const accentBlue = '3A86FF';
    const textWhite = 'FFFFFF';
    const textMuted = '94A3B8';
    const tableBorder = '334155';

    for (let i = 0; i < slides.length; i++) {
      const slideData = slides[i];
      const slide = pptx.addSlide();
      slide.background = { color: bgDark };

      // Top decorative brand accent line
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: '100%',
        h: 0.08,
        fill: { color: accentCyan },
      });

      if (slideData.layout === 'title' || i === 0) {
        // --- TITLE SLIDE ---
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 1.0,
          y: 1.2,
          w: 11.3,
          h: 5.0,
          fill: { color: cardBg },
          line: { color: accentBlue, width: 1 },
        });

        slide.addShape(pptx.ShapeType.roundRect, {
          x: 1.5,
          y: 1.8,
          w: 2.4,
          h: 0.4,
          fill: { color: '0A2540' },
          line: { color: accentCyan, width: 1 },
        });

        slide.addText('INFINALL INTELLIGENCE', {
          x: 1.5,
          y: 1.8,
          w: 2.4,
          h: 0.4,
          fontSize: 10,
          bold: true,
          color: accentCyan,
          align: 'center',
          valign: 'middle',
        });

        slide.addText(cleanMarkdown(slideData.title), {
          x: 1.5,
          y: 2.4,
          w: 10.3,
          h: 1.8,
          fontSize: 34,
          bold: true,
          color: textWhite,
          valign: 'top',
        });

        const sub = slideData.subtitle || 'Strategic Brief & Growth Roadmap';
        slide.addText(cleanMarkdown(sub), {
          x: 1.5,
          y: 4.4,
          w: 10.3,
          h: 0.8,
          fontSize: 18,
          color: textMuted,
        });

        slide.addText('Autonomous Marketing Intelligence • Confidential', {
          x: 1.5,
          y: 5.4,
          w: 10.3,
          h: 0.4,
          fontSize: 11,
          color: textMuted,
        });
      } else if (slideData.table && slideData.table.headers.length > 0) {
        // --- TABLE SLIDE ---
        slide.addText(cleanMarkdown(slideData.title), {
          x: 0.8,
          y: 0.5,
          w: 11.7,
          h: 0.7,
          fontSize: 24,
          bold: true,
          color: textWhite,
        });

        if (slideData.subtitle) {
          slide.addText(cleanMarkdown(slideData.subtitle), {
            x: 0.8,
            y: 1.1,
            w: 11.7,
            h: 0.4,
            fontSize: 13,
            color: accentCyan,
          });
        }

        const tableRows: pptxgen.TableRow[] = [];

        const headerCells = slideData.table.headers.map((h) => ({
          text: cleanMarkdown(h),
          options: {
            bold: true,
            color: textWhite,
            fill: { color: '0A2540' },
            fontSize: 12,
            align: 'center' as const,
            valign: 'middle' as const,
          },
        }));
        tableRows.push(headerCells);

        slideData.table.rows.slice(0, 7).forEach((row, rIdx) => {
          const cells = row.map((cell) => ({
            text: cleanMarkdown(cell),
            options: {
              color: textWhite,
              fill: { color: rIdx % 2 === 0 ? cardBg : '141E33' },
              fontSize: 11,
              valign: 'middle' as const,
            },
          }));
          tableRows.push(cells);
        });

        slide.addTable(tableRows, {
          x: 0.8,
          y: slideData.subtitle ? 1.6 : 1.4,
          w: 11.7,
          colW: Array(slideData.table.headers.length).fill(11.7 / slideData.table.headers.length),
          border: { pt: 1, color: tableBorder },
          margin: 0.1,
        });
      } else if (slideData.statCards && slideData.statCards.length > 0) {
        // --- STAT CARDS SLIDE ---
        slide.addText(cleanMarkdown(slideData.title), {
          x: 0.8,
          y: 0.5,
          w: 11.7,
          h: 0.7,
          fontSize: 24,
          bold: true,
          color: textWhite,
        });

        const numCards = Math.min(slideData.statCards.length, 4);
        const cardWidth = (11.7 - (numCards - 1) * 0.3) / numCards;

        slideData.statCards.slice(0, 4).forEach((card, idx) => {
          const cardX = 0.8 + idx * (cardWidth + 0.3);

          slide.addShape(pptx.ShapeType.roundRect, {
            x: cardX,
            y: 1.6,
            w: cardWidth,
            h: 4.5,
            fill: { color: cardBg },
            line: { color: tableBorder, width: 1 },
          });

          slide.addText(cleanMarkdown(card.value), {
            x: cardX + 0.2,
            y: 2.0,
            w: cardWidth - 0.4,
            h: 1.0,
            fontSize: 32,
            bold: true,
            color: accentCyan,
            align: 'center',
          });

          slide.addText(cleanMarkdown(card.label), {
            x: cardX + 0.2,
            y: 3.1,
            w: cardWidth - 0.4,
            h: 0.8,
            fontSize: 14,
            bold: true,
            color: textWhite,
            align: 'center',
          });

          if (card.subtext) {
            slide.addText(cleanMarkdown(card.subtext), {
              x: cardX + 0.2,
              y: 4.0,
              w: cardWidth - 0.4,
              h: 1.6,
              fontSize: 11,
              color: textMuted,
              align: 'center',
            });
          }
        });
      } else {
        // --- STANDARD CONTENT SLIDE ---
        slide.addText(cleanMarkdown(slideData.title), {
          x: 0.8,
          y: 0.5,
          w: 11.7,
          h: 0.7,
          fontSize: 24,
          bold: true,
          color: textWhite,
        });

        let currentY = 1.3;

        if (slideData.callout) {
          slide.addShape(pptx.ShapeType.roundRect, {
            x: 0.8,
            y: currentY,
            w: 11.7,
            h: 1.1,
            fill: { color: '0E2A47' },
            line: { color: accentCyan, width: 1 },
          });

          slide.addText(`💡 ${cleanMarkdown(slideData.callout)}`, {
            x: 1.0,
            y: currentY + 0.1,
            w: 11.3,
            h: 0.9,
            fontSize: 12,
            italic: true,
            color: accentCyan,
            valign: 'middle',
          });

          currentY += 1.3;
        }

        if (slideData.bulletPoints && slideData.bulletPoints.length > 0) {
          const bullets = slideData.bulletPoints.slice(0, 6).map((bp) => {
            const cleanText = cleanMarkdown(bp);
            return {
              text: cleanText,
              options: {
                fontSize: 14,
                color: textWhite,
                bullet: true,
                breakLine: true,
                spaceAfter: 12,
              },
            };
          });

          slide.addText(bullets, {
            x: 0.8,
            y: currentY,
            w: 11.7,
            h: 6.8 - currentY,
            valign: 'top',
          });
        }
      }

      if (i > 0) {
        slide.addText('Infinall Chat • Confidential Deliverable', {
          x: 0.8,
          y: 7.0,
          w: 6.0,
          h: 0.3,
          fontSize: 9,
          color: textMuted,
        });

        slide.addText(`${i + 1} / ${slides.length}`, {
          x: 10.5,
          y: 7.0,
          w: 2.0,
          h: 0.3,
          fontSize: 9,
          color: textMuted,
          align: 'right',
        });
      }
    }

    const buffer = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
    return buffer;
  }

  private static parseMarkdownToDeck(
    md: string,
    fallbackTitle?: string
  ): { title: string; slides: ParsedSlide[] } {
    const lines = md.split('\n');
    let title = fallbackTitle || 'Strategic Intelligence Brief';
    const slides: ParsedSlide[] = [];

    let currentSlide: ParsedSlide | null = null;
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    const flushTable = () => {
      if (inTable && tableHeaders.length > 0 && currentSlide) {
        currentSlide.table = {
          headers: tableHeaders,
          rows: tableRows,
        };
        currentSlide.layout = 'table';
        inTable = false;
        tableHeaders = [];
        tableRows = [];
      }
    };

    const flushSlide = () => {
      flushTable();
      if (currentSlide) {
        const hasBullets = currentSlide.bulletPoints && currentSlide.bulletPoints.length > 0;
        const hasTable = !!currentSlide.table;
        const hasCallout = !!currentSlide.callout;
        const isTitleLayout = currentSlide.layout === 'title';

        if (hasBullets || hasTable || hasCallout || isTitleLayout) {
          slides.push(currentSlide);
        }
        currentSlide = null;
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        if (trimmed.includes('---')) continue;
        const cells = trimmed
          .split('|')
          .map((c) => cleanMarkdown(c.trim()))
          .filter(Boolean);

        if (!inTable) {
          inTable = true;
          tableHeaders = cells;
          tableRows = [];
        } else {
          tableRows.push(cells);
        }
        continue;
      } else if (inTable) {
        flushTable();
      }

      if (trimmed.startsWith('# ')) {
        flushSlide();
        title = cleanMarkdown(trimmed.replace(/^#\s+/, ''));
        currentSlide = {
          title,
          subtitle: 'Executive Intelligence & Strategy Plan',
          layout: 'title',
        };
        flushSlide();
      } else if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
        flushSlide();
        const sectionHeading = cleanMarkdown(trimmed.replace(/^#+\s+/, ''));
        currentSlide = {
          title: sectionHeading,
          layout: 'content',
          bulletPoints: [],
        };
      } else if (trimmed.startsWith('> ')) {
        if (!currentSlide) {
          currentSlide = { title: 'Key Takeaways', layout: 'content', bulletPoints: [] };
        }
        currentSlide.callout = cleanMarkdown(trimmed.replace(/^>\s+/, ''));
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s+/.test(trimmed)) {
        if (!currentSlide) {
          currentSlide = { title: 'Executive Summary', layout: 'content', bulletPoints: [] };
        }
        const bulletText = trimmed.replace(/^([-*]|\d+\.)\s+/, '');
        if (bulletText) {
          currentSlide.bulletPoints?.push(bulletText);
        }
      } else if (trimmed && !trimmed.startsWith('```')) {
        if (!currentSlide) {
          currentSlide = { title: 'Strategic Analysis', layout: 'content', bulletPoints: [] };
        }
        if (trimmed.length > 5) {
          currentSlide.bulletPoints?.push(trimmed);
        }
      }
    }

    flushSlide();

    if (slides.length === 0) {
      slides.push({
        title,
        subtitle: 'Executive Presentation',
        layout: 'title',
      });
    }

    return { title, slides };
  }
}
