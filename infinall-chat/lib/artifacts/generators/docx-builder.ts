// ============================================================
// Infinall Chat - Native DOCX Document Generator
// ============================================================

import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  Packer,
} from 'docx';

export interface DocxOptions {
  title: string;
  subtitle?: string;
  companyName?: string;
  author?: string;
  sections?: Array<{
    heading?: string;
    paragraphs?: string[];
    callout?: string;
    table?: {
      headers: string[];
      rows: string[][];
    };
  }>;
}

export class DocxBuilder {
  static async buildDocument(options: DocxOptions | string): Promise<Buffer> {
    let parsed: DocxOptions;

    if (typeof options === 'string') {
      try {
        parsed = JSON.parse(options);
      } catch {
        // Parse markdown text into sections
        parsed = this.parseMarkdownToSections(options);
      }
    } else {
      parsed = options;
    }

    const docChildren: (Paragraph | Table)[] = [];

    // Title & Header
    docChildren.push(
      new Paragraph({
        text: parsed.title,
        heading: HeadingLevel.TITLE,
        spacing: { after: 150 },
      })
    );

    if (parsed.subtitle) {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: parsed.subtitle,
              italics: true,
              color: '64748b',
              size: 24,
            }),
          ],
          spacing: { after: 300 },
        })
      );
    }

    if (parsed.companyName || parsed.author) {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Prepared by: ${parsed.author || 'Infinall Marketing Agent'} | Organization: ${
                parsed.companyName || 'Infinall'
              }`,
              size: 18,
              color: '94a3b8',
            }),
          ],
          spacing: { after: 400 },
        })
      );
    }

    // Sections
    const sections = parsed.sections || [];
    for (const section of sections) {
      if (section.heading) {
        docChildren.push(
          new Paragraph({
            text: section.heading,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 150 },
          })
        );
      }

      if (section.callout) {
        docChildren.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: '💡 KEY STRATEGIC INSIGHT:\n',
                            bold: true,
                            color: '2563eb',
                            size: 20,
                          }),
                          new TextRun({
                            text: section.callout,
                            italics: true,
                            size: 20,
                          }),
                        ],
                      }),
                    ],
                    borders: {
                      left: { style: BorderStyle.SINGLE, size: 24, color: '2563eb' },
                      top: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                    },
                    margins: { top: 120, bottom: 120, left: 160, right: 160 },
                  }),
                ],
              }),
            ],
          })
        );
        docChildren.push(new Paragraph({ spacing: { after: 150 } }));
      }

      if (section.paragraphs) {
        for (const p of section.paragraphs) {
          docChildren.push(
            new Paragraph({
              children: [new TextRun({ text: p, size: 22 })],
              spacing: { after: 150 },
            })
          );
        }
      }

      if (section.table && section.table.headers.length > 0) {
        const headerRow = new TableRow({
          tableHeader: true,
          children: section.table.headers.map(
            (h) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: h, bold: true, color: 'ffffff', size: 20 })],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                shading: { fill: '1e293b' },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
              })
          ),
        });

        const dataRows = section.table.rows.map(
          (row, rIdx) =>
            new TableRow({
              children: row.map(
                (cell) =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: cell, size: 20 })],
                      }),
                    ],
                    shading: { fill: rIdx % 2 === 0 ? 'f8fafc' : 'ffffff' },
                    margins: { top: 80, bottom: 80, left: 80, right: 80 },
                  })
              ),
            })
        );

        docChildren.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
          })
        );
        docChildren.push(new Paragraph({ spacing: { after: 200 } }));
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docChildren,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    return buffer;
  }

  private static parseMarkdownToSections(md: string): DocxOptions {
    const lines = md.split('\n');
    let title = 'Marketing Strategy Document';
    const sections: DocxOptions['sections'] = [];
    let currentSection: { heading?: string; paragraphs: string[] } = {
      paragraphs: [],
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        title = trimmed.replace(/^#\s+/, '');
      } else if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
        if (currentSection.paragraphs.length > 0 || currentSection.heading) {
          sections.push(currentSection);
        }
        currentSection = {
          heading: trimmed.replace(/^#+\s+/, ''),
          paragraphs: [],
        };
      } else if (trimmed) {
        currentSection.paragraphs.push(trimmed);
      }
    }

    if (currentSection.paragraphs.length > 0 || currentSection.heading) {
      sections.push(currentSection);
    }

    return { title, sections };
  }
}
