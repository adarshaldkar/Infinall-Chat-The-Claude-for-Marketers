// ============================================================
// Infinall Chat - Plain Text Document Parser Adapter
// ============================================================

import { DocumentParser, ParserInput, ParseResult, ParsedDocument } from '../types';

export class TextDocumentParser implements DocumentParser {
  readonly name = 'text-parser';
  readonly supportedTypes = ['text' as const];

  supports(input: ParserInput): boolean {
    const ext = input.fileName.toLowerCase().split('.').pop();
    return ext === 'txt' || ext === 'text' || ext === 'log' || input.mimeType === 'text/plain';
  }

  async parse(input: ParserInput): Promise<ParseResult> {
    try {
      const { fileName, buffer, sizeBytes } = input;
      const text = buffer.toString('utf-8');
      const cleanTitle = fileName.replace(/\.(txt|text|log)$/i, '').replace(/[_-]/g, ' ');

      const document: ParsedDocument = {
        title: cleanTitle,
        mimeType: 'text/plain',
        sourceType: 'text',
        text: text.trim(),
        sections: [
          {
            id: 'sec-1',
            heading: cleanTitle,
            level: 1,
            text: text.trim(),
          },
        ],
        metadata: {
          fileName,
          fileSizeBytes: sizeBytes,
          lineCount: text.split('\n').length,
          parsedAt: new Date().toISOString(),
          parserName: this.name,
        },
      };

      return { ok: true, document };
    } catch (err) {
      return {
        ok: false,
        code: 'CORRUPT_FILE',
        message: `Failed to parse TXT: ${err instanceof Error ? err.message : String(err)}`,
        retryable: false,
      };
    }
  }
}
