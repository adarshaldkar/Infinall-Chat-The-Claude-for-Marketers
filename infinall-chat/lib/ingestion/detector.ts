// ============================================================
// Infinall Chat - MIME, Extension & Magic-Byte Ingestion Detector
// ============================================================

import { SourceType, ParserInput } from './types';

export class FormatDetector {
  /**
   * Identifies the canonical SourceType using magic bytes first, then MIME/ext.
   */
  static detectSourceType(input: ParserInput): SourceType {
    const { fileName, mimeType, buffer } = input;
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    // 1. Binary Magic Byte Validation
    if (buffer && buffer.length >= 4) {
      // PDF: %PDF- (0x25 0x50 0x44 0x46)
      if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
        return 'pdf';
      }

      // PNG: 0x89 0x50 0x4E 0x47
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        return 'image';
      }

      // JPEG: 0xFF 0xD8 0xFF
      if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return 'image';
      }

      // GIF: GIF8 (0x47 0x49 0x46 0x38)
      if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
        return 'image';
      }

      // WebP / RIFF container
      if (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      ) {
        return 'image';
      }

      // ZIP container (DOCX / PPTX / XLSX / JAR) -> PK\x03\x04
      if (buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
        if (ext === 'docx' || ext === 'doc') return 'docx';
        if (ext === 'pptx' || ext === 'ppt') return 'pptx';
        if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
      }
    }

    // 2. MIME Type Detection
    if (mimeType) {
      if (mimeType === 'application/pdf') return 'pdf';
      if (mimeType.includes('wordprocessingml') || mimeType === 'application/msword') return 'docx';
      if (mimeType.includes('presentationml') || mimeType === 'application/vnd.ms-powerpoint') return 'pptx';
      if (mimeType.includes('spreadsheetml') || mimeType === 'application/vnd.ms-excel') return 'xlsx';
      if (mimeType === 'text/csv' || mimeType === 'text/tab-separated-values') return 'csv';
      if (mimeType === 'text/html' || mimeType === 'application/xhtml+xml') return 'html';
      if (mimeType === 'text/markdown' || mimeType === 'text/x-markdown') return 'markdown';
      if (mimeType === 'application/json') return 'json';
      if (mimeType === 'application/xml' || mimeType === 'text/xml') return 'xml';
      if (mimeType.startsWith('image/')) return 'image';
      if (mimeType.startsWith('video/')) return 'video';
      if (mimeType.startsWith('audio/')) return 'audio';
    }

    // 3. File Extension Detection
    switch (ext) {
      case 'pdf': return 'pdf';
      case 'docx':
      case 'doc': return 'docx';
      case 'pptx':
      case 'ppt': return 'pptx';
      case 'xlsx':
      case 'xls': return 'xlsx';
      case 'csv':
      case 'tsv': return 'csv';
      case 'html':
      case 'htm': return 'html';
      case 'md':
      case 'markdown': return 'markdown';
      case 'txt':
      case 'text':
      case 'log': return 'text';
      case 'json': return 'json';
      case 'xml': return 'xml';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
      case 'gif':
      case 'svg': return 'image';
      case 'mp4':
      case 'webm':
      case 'mov':
      case 'mkv': return 'video';
      case 'mp3':
      case 'wav':
      case 'ogg':
      case 'm4a': return 'audio';
      default: return 'unknown';
    }
  }
}
