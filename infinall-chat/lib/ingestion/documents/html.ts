// ============================================================
// Infinall Chat - Semantic HTML Parser Adapter
// Zero-dependency pure semantic HTML to markdown converter
// ============================================================

import { DocumentParser, ParserInput, ParseResult, ParsedDocument, ParsedSection } from '../types';

export class HtmlDocumentParser implements DocumentParser {
  readonly name = 'html-parser';
  readonly supportedTypes = ['html' as const];

  supports(input: ParserInput): boolean {
    const ext = input.fileName.toLowerCase().split('.').pop();
    return ext === 'html' || ext === 'htm' || input.mimeType.includes('text/html');
  }

  async parse(input: ParserInput): Promise<ParseResult> {
    try {
      const { fileName, buffer, sizeBytes } = input;
      let html = buffer.toString('utf-8');

      // 1. Strip scripts, styles, comments, head noise, and tracking tags
      html = html
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
        .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
        .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
        .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '');

      // Extract title
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      const pageTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : fileName.replace(/\.html?$/i, '');

      // Convert headings to markdown
      html = html
        .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n\n')
        .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n\n')
        .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n\n')
        .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n\n')
        .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
        .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
        .replace(/<br\s*\/?>/gi, '\n');

      // Strip all remaining HTML tags
      const cleanMarkdown = html
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      const sections: ParsedSection[] = [];
      const lines = cleanMarkdown.split('\n');
      let currentSection: ParsedSection = {
        id: 'sec-1',
        heading: pageTitle,
        level: 1,
        text: '',
      };

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('# ')) {
          if (currentSection.text.trim()) sections.push(currentSection);
          currentSection = {
            id: `sec-${sections.length + 1}`,
            heading: trimmed.replace(/^#\s+/, ''),
            level: 1,
            text: '',
          };
        } else if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
          if (currentSection.text.trim()) sections.push(currentSection);
          currentSection = {
            id: `sec-${sections.length + 1}`,
            heading: trimmed.replace(/^#+\s+/, ''),
            level: 2,
            text: '',
          };
        } else if (trimmed) {
          currentSection.text += `${line}\n`;
        }
      }

      if (currentSection.text.trim() || sections.length === 0) {
        sections.push(currentSection);
      }

      const document: ParsedDocument = {
        title: pageTitle,
        mimeType: 'text/html',
        sourceType: 'html',
        text: cleanMarkdown,
        sections,
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
        message: `Failed to parse HTML: ${err instanceof Error ? err.message : String(err)}`,
        retryable: false,
      };
    }
  }
}
