// ============================================================
// Infinall Chat - XML Document Parser Adapter
// ============================================================

import { DocumentParser, ParserInput, ParseResult, ParsedDocument } from '../types';

export class XmlDocumentParser implements DocumentParser {
  readonly name = 'xml-parser';
  readonly supportedTypes = ['xml' as const];

  supports(input: ParserInput): boolean {
    const ext = input.fileName.toLowerCase().split('.').pop();
    return ext === 'xml' || input.mimeType.includes('xml');
  }

  async parse(input: ParserInput): Promise<ParseResult> {
    try {
      const { fileName, buffer, sizeBytes } = input;
      const text = buffer.toString('utf-8');
      const cleanTitle = fileName.replace(/\.xml$/i, '').replace(/[_-]/g, ' ');

      // Clean basic XML tags to extract content while preserving structure
      const stripped = text
        .replace(/<\?[^>]+\?>/g, '') // strip processing instructions
        .replace(/<!--[\s\S]*?-->/g, '') // strip comments
        .replace(/<([^>]+)>/g, '\n$1: ') // tag names as labels
        .replace(/\n\s*\n/g, '\n')
        .trim();

      const document: ParsedDocument = {
        title: cleanTitle,
        mimeType: 'application/xml',
        sourceType: 'xml',
        text: stripped,
        sections: [
          {
            id: 'sec-1',
            heading: cleanTitle,
            level: 1,
            text: stripped,
          },
        ],
        metadata: {
          fileName,
          fileSizeBytes: sizeBytes,
          parsedAt: new Date().toISOString(),
          parserName: this.name,
        },
      };

      return { ok: true, document };
    } catch (err) {
      return {
        ok: false,
        code: 'CORRUPT_FILE',
        message: `Failed to parse XML: ${err instanceof Error ? err.message : String(err)}`,
        retryable: false,
      };
    }
  }
}
