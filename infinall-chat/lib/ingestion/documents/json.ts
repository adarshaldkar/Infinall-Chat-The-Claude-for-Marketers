// ============================================================
// Infinall Chat - JSON Document Parser Adapter
// Converts structured JSON into semantic markdown key-value representations
// ============================================================

import { DocumentParser, ParserInput, ParseResult, ParsedDocument, ParsedSection } from '../types';

export class JsonDocumentParser implements DocumentParser {
  readonly name = 'json-parser';
  readonly supportedTypes = ['json' as const];

  supports(input: ParserInput): boolean {
    const ext = input.fileName.toLowerCase().split('.').pop();
    return ext === 'json' || input.mimeType === 'application/json';
  }

  async parse(input: ParserInput): Promise<ParseResult> {
    try {
      const { fileName, buffer, sizeBytes } = input;
      const text = buffer.toString('utf-8');
      const data = JSON.parse(text);

      const cleanTitle = fileName.replace(/\.json$/i, '').replace(/[_-]/g, ' ');
      const sections: ParsedSection[] = [];
      let fullMarkdown = `# ${cleanTitle}\n\n`;

      if (Array.isArray(data)) {
        fullMarkdown += `### Array Dataset (${data.length} records):\n\n`;
        data.slice(0, 500).forEach((item, idx) => {
          const recordText = typeof item === 'object' && item !== null
            ? Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(' | ')
            : String(item);
          fullMarkdown += `- [Record ${idx + 1}] ${recordText}\n`;
        });
        sections.push({
          id: 'sec-1',
          heading: 'Dataset Records',
          level: 2,
          text: fullMarkdown,
        });
      } else if (typeof data === 'object' && data !== null) {
        Object.entries(data).forEach(([key, val], idx) => {
          const valStr = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
          const secMd = `### ${key}\n\`\`\`json\n${valStr}\n\`\`\`\n\n`;
          fullMarkdown += secMd;
          sections.push({
            id: `sec-${idx + 1}`,
            heading: key,
            level: 2,
            text: secMd,
          });
        });
      } else {
        fullMarkdown += String(data);
        sections.push({ id: 'sec-1', heading: cleanTitle, text: fullMarkdown });
      }

      const document: ParsedDocument = {
        title: cleanTitle,
        mimeType: 'application/json',
        sourceType: 'json',
        text: fullMarkdown.trim(),
        sections,
        metadata: {
          fileName,
          fileSizeBytes: sizeBytes,
          isArray: Array.isArray(data),
          parsedAt: new Date().toISOString(),
          parserName: this.name,
        },
      };

      return { ok: true, document };
    } catch (err) {
      return {
        ok: false,
        code: 'CORRUPT_FILE',
        message: `Failed to parse JSON: ${err instanceof Error ? err.message : String(err)}`,
        retryable: false,
      };
    }
  }
}
