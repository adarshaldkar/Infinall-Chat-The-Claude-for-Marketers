// ============================================================
// Infinall Chat - Ingestion Document Normalizer
// Standardizes text, extracts semantic headings, and builds citations
// ============================================================

import { ParsedDocument, ParsedSection } from './types';

export class DocumentNormalizer {
  /**
   * Normalizes a ParsedDocument into clean, well-spaced markdown
   * with consistent headers and metadata attributes.
   */
  static normalize(doc: ParsedDocument): ParsedDocument {
    const cleanText = this.cleanText(doc.text);

    const normalizedSections: ParsedSection[] = (doc.sections || []).map((sec, idx) => ({
      id: sec.id || `sec-${idx + 1}`,
      heading: sec.heading ? this.cleanInline(sec.heading) : undefined,
      level: sec.level || 2,
      text: this.cleanText(sec.text),
      pageNumber: sec.pageNumber,
      slideNumber: sec.slideNumber,
      sheetName: sec.sheetName,
    }));

    return {
      ...doc,
      title: this.cleanInline(doc.title),
      text: cleanText,
      sections: normalizedSections.length > 0 ? normalizedSections : [
        {
          id: 'sec-1',
          heading: doc.title,
          level: 1,
          text: cleanText,
        },
      ],
    };
  }

  private static cleanText(text: string): string {
    if (!text) return '';
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '') // remove control chars
      .replace(/\n{3,}/g, '\n\n') // collapse multiple blank lines
      .trim();
  }

  private static cleanInline(str: string): string {
    if (!str) return '';
    return str.replace(/\s+/g, ' ').trim();
  }
}
