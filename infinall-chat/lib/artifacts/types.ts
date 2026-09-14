// ============================================================
// Infinall Chat - Universal Artifacts Specification & Types
// ============================================================

export type ArtifactType =
  | 'html'
  | 'react'
  | 'markdown'
  | 'docx'
  | 'pptx'
  | 'xlsx'
  | 'pdf'
  | 'chart'
  | 'mermaid'
  | 'svg'
  | 'code';

export interface ArtifactSnapshot {
  version: number;
  timestamp: number;
  content: string;
  summary?: string;
}

export interface UniversalArtifact {
  id: string;
  type: ArtifactType;
  title: string;
  language?: string;
  content: string;
  version: number;
  isStreaming: boolean;
  history?: ArtifactSnapshot[];
}

export interface ArtifactExportRequest {
  artifactId: string;
  title: string;
  type: ArtifactType;
  content: string;
  formatOptions?: {
    theme?: 'dark' | 'light';
    includeCharts?: boolean;
    companyName?: string;
    author?: string;
  };
}

export interface SpreadsheetSheetData {
  name: string;
  headers?: string[];
  rows: Array<Array<string | number | boolean | null | { formula: string }>>;
  columnWidths?: number[];
}

export interface SpreadsheetWorkbookPayload {
  title?: string;
  sheets: SpreadsheetSheetData[];
}

export interface PresentationSlidePayload {
  title: string;
  subtitle?: string;
  layout?: 'title' | 'content' | 'stats' | 'split' | 'table' | 'timeline';
  bulletPoints?: string[];
  statCards?: Array<{ label: string; value: string; subtext?: string }>;
  tableData?: {
    headers: string[];
    rows: string[][];
  };
  speakerNotes?: string;
}

export interface PresentationPayload {
  title: string;
  theme?: 'dark' | 'light';
  slides: PresentationSlidePayload[];
}

export interface ChartDataPayload {
  title?: string;
  type: 'line' | 'bar' | 'area' | 'pie' | 'funnel';
  xAxisKey: string;
  data: Array<Record<string, string | number>>;
  series: Array<{
    dataKey: string;
    label: string;
    color?: string;
  }>;
}
