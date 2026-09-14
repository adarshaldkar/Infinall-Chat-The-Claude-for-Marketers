// ============================================================
// Infinall Chat - Artifact Immutable Version Store & Diff Engine
// ============================================================

import { ArtifactSnapshot } from './types';

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumberOld?: number;
  lineNumberNew?: number;
}

export class ArtifactVersionStore {
  private static store: Map<string, ArtifactSnapshot[]> = new Map();

  /**
   * Commit a new version snapshot for an artifact
   */
  static commit(
    artifactId: string,
    content: string,
    summary?: string
  ): ArtifactSnapshot {
    const history = this.store.get(artifactId) || [];
    const nextVersion = history.length + 1;

    const snapshot: ArtifactSnapshot = {
      version: nextVersion,
      timestamp: Date.now(),
      content,
      summary: summary || `Version ${nextVersion}`,
    };

    history.push(snapshot);
    this.store.set(artifactId, history);
    return snapshot;
  }

  /**
   * Get all version snapshots for an artifact
   */
  static getHistory(artifactId: string): ArtifactSnapshot[] {
    return this.store.get(artifactId) || [];
  }

  /**
   * Get a specific version snapshot
   */
  static getVersion(
    artifactId: string,
    version: number
  ): ArtifactSnapshot | null {
    const history = this.store.get(artifactId) || [];
    return history.find((s) => s.version === version) || null;
  }

  /**
   * Calculate a line-by-line diff between two version strings
   */
  static computeDiff(oldContent: string, newContent: string): DiffLine[] {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const diff: DiffLine[] = [];

    let i = 0;
    let j = 0;

    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length) {
        if (oldLines[i] === newLines[j]) {
          diff.push({
            type: 'unchanged',
            content: oldLines[i],
            lineNumberOld: i + 1,
            lineNumberNew: j + 1,
          });
          i++;
          j++;
        } else {
          // Check if new line was inserted
          const lookaheadInNew = newLines.slice(j).indexOf(oldLines[i]);
          if (lookaheadInNew !== -1 && lookaheadInNew < 5) {
            // New lines were added
            for (let k = 0; k < lookaheadInNew; k++) {
              diff.push({
                type: 'added',
                content: newLines[j + k],
                lineNumberNew: j + k + 1,
              });
            }
            j += lookaheadInNew;
          } else {
            // Old line was removed
            diff.push({
              type: 'removed',
              content: oldLines[i],
              lineNumberOld: i + 1,
            });
            i++;
          }
        }
      } else if (i < oldLines.length) {
        diff.push({
          type: 'removed',
          content: oldLines[i],
          lineNumberOld: i + 1,
        });
        i++;
      } else if (j < newLines.length) {
        diff.push({
          type: 'added',
          content: newLines[j],
          lineNumberNew: j + 1,
        });
        j++;
      }
    }

    return diff;
  }

  /**
   * Clear snapshots (for testing)
   */
  static clear() {
    this.store.clear();
  }
}
