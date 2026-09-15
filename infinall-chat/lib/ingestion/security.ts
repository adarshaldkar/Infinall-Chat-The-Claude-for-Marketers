// ============================================================
// Infinall Chat - Ingestion Security & Magic-Byte Guardrails
// ============================================================

import JSZip from 'jszip';

export interface SecurityCheckResult {
  valid: boolean;
  code?: string;
  error?: string;
}

const MAX_TOTAL_UNCOMPRESSED_BYTES = 250 * 1024 * 1024; // 250MB
const MAX_COMPRESSION_RATIO = 100; // 100x max compression ratio for zip-based files

export class IngestionSecurity {
  /**
   * Validate file buffer size against maximum limits.
   */
  static validateSize(sizeBytes: number, maxBytes: number = 50 * 1024 * 1024): SecurityCheckResult {
    if (sizeBytes <= 0) {
      return { valid: false, code: 'EMPTY_CONTENT', error: 'File is empty (0 bytes).' };
    }
    if (sizeBytes > maxBytes) {
      return {
        valid: false,
        code: 'FILE_TOO_LARGE',
        error: `File size (${(sizeBytes / 1024 / 1024).toFixed(1)}MB) exceeds maximum ${(maxBytes / 1024 / 1024).toFixed(1)}MB.`,
      };
    }
    return { valid: true };
  }

  /**
   * Sanitizes filenames to prevent path traversal or shell injection attacks.
   */
  static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[\/\\]/g, '_')
      .replace(/\.\./g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  /**
   * Checks for ZIP bomb decompression attacks in OOXML (DOCX, PPTX, XLSX) & ZIP files.
   */
  static async checkZipBomb(buffer: Buffer): Promise<SecurityCheckResult> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      let totalUncompressed = 0;

      for (const [, file] of Object.entries(zip.files)) {
        if (!file.dir) {
          // JSZip internally stores uncompressed size in _data.uncompressedSize if available
          const uncompressedSize = (file as any)._data?.uncompressedSize || buffer.length;
          totalUncompressed += uncompressedSize;

          if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) {
            return {
              valid: false,
              code: 'ZIP_BOMB_DETECTED',
              error: 'File exceeds maximum safe uncompressed decompression limit (potential zip bomb).',
            };
          }
        }
      }

      const ratio = totalUncompressed / Math.max(1, buffer.length);
      if (ratio > MAX_COMPRESSION_RATIO) {
        return {
          valid: false,
          code: 'ZIP_BOMB_DETECTED',
          error: `High compression ratio (${ratio.toFixed(1)}x) exceeds safe limits.`,
        };
      }

      return { valid: true };
    } catch {
      // If not a valid zip or cannot read, allow downstream parser to handle format validation
      return { valid: true };
    }
  }
}
