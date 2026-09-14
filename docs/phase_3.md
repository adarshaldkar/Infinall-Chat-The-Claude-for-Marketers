# Phase 3: Universal Multi-Format Artifacts Workspace & Document Generators Specification

**Project**: Infinall Chat — The Claude for Marketers  
**Phase**: Phase 3 — Universal Artifacts Workspace, Multi-Format Renderers & Binary Document Generators  
**Target Root**: `c:\Users\shrut\Desktop\Infianl.ai_2`  
**API Gateway**: `https://llm.ganeshnayak.in/`

---

## 1. Executive Summary & Objective

Phase 1 established Claude-parity visual styling, streaming chat, and a collapsible split-pane layout. Phase 2 delivered the autonomous multi-turn agent harness, Model Context Protocol (MCP) data connectivity, deferred tool discovery, and cryptographic mutation safety.

**Phase 3** transforms the right workspace panel into a **Universal Multi-Format Artifacts Engine**. In Claude, artifacts are limited to code, HTML, SVG, and basic markdown. In **Infinall Chat for Marketers**, artifacts are upgraded into an **enterprise-grade deliverable studio** capable of generating, rendering, editing, and exporting:
1. **Interactive HTML/React Web Apps & Micro-Tools**: Calculators, simulators, interactive dashboards, and landing page prototypes rendered in a secure sandboxed iframe.
2. **Rich WYSIWYG Marketing Documents**: TipTap-powered living markdown documents with real-time editing, versioning, and formatting.
3. **Binary Document Generation Engine**: Native generation and one-click export of production-grade **DOCX** (strategy memos), **PDF** (reports), **PPTX** (pitch decks), and **XLSX** (media plans and CAC/LTV financial models with active formulas).
4. **Data Visualizations & Diagrams**: Interactive Recharts dashboards and Mermaid.js diagrams (marketing funnels, customer journeys, campaign workflows).
5. **Artifact Lifecycle, Snapshot Versioning & Cloud Export**: Dual-channel streaming interceptor, `v1 -> vN` immutable snapshot history, visual diff comparator, and one-click Google Drive / download exports.

---

## 2. Architecture & Data Flow

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           User Chat & Artifact Split View                       │
└──────────────┬──────────────────────────────────────────────────▲───────────────┘
               │ 1. User Prompt (e.g., "Build Q3 Paid Media Plan & Export XLSX")  │
               ▼                                                                 │
┌───────────────────────────────────────────────────────────────────────────────┐ │
│                       Agent Loop & Streaming Gateway                          │ │
│   - Model streams token sequence with interleaved <antArtifact> tags          │ │
└──────────────┬────────────────────────────────────────────────────────────────┘ │
               │ 2. Raw Token Stream (SSE)                                       │
               ▼                                                                 │
┌───────────────────────────────────────────────────────────────────────────────┐ │
│                       Live Stream Interceptor Engine                          │ │
│                                                                               │ │
│   ┌───────────────────────────────────┐   ┌─────────────────────────────────┐ │ │
│   │ Text Outside Tag Buffer           │   │ Inside <antArtifact> Parser     │ │ │
│   │ -> Emits text_delta to Chat Window│   │ -> Emits artifact_open          │ │ │
│   │                                   │   │ -> Emits artifact_delta         │ │ │
│   │                                   │   │ -> Emits artifact_complete      │ │ │
│   └───────────────────────────────────┘   └────────────────┬────────────────┘ │ │
└────────────────────────────────────────────────────────────┼──────────────────┘ │
                                                             │ 3. Dispatch Type  │
                                                             ▼                   │
┌───────────────────────────────────────────────────────────────────────────────┐ │
│                     Universal Multi-Format Artifact Runtimes                  │ │
│                                                                               │ │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────┐  │ │
│  │ HTML/React App Engine │  │ Rich Document Studio  │  │ Marketing Charts  │  │ │
│  │ - Sandboxed <iframe>  │  │ - TipTap Markdown     │  │ - Recharts &      │  │ │
│  │ - Tailwind + Lucide   │  │ - WYSIWYG Live Sync   │  │   Mermaid Canvas  │  │ │
│  │ - React Babel Runtime │  │ - Version Snapshots   │  │ - Dynamic Metrics │  │ │
│  └───────────────────────┘  └───────────────────────┘  └───────────────────┘  │ │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │ │
│  │                   Binary Document Generator Suite                       │  │ │
│  │  ├─ DOCX: Executive Strategy Briefs & Brand Guidelines (`docx`)         │  │ │
│  │  ├─ PDF: Print-Ready Reports & Whitepapers (`pdf-lib` / Canvas)         │  │ │
│  │  ├─ PPTX: 16:9 60fps Presentation Decks (`pptxgenjs`)                   │  │ │
│  │  └─ XLSX: Multi-Sheet Financial Models & Media Plans (`exceljs`/`xlsx`) │  │ │
│  └─────────────────────────────────────────────────────────────────────────┘  │ │
└────────────────────────────────────────────────────────────┬──────────────────┘ │
                                                             │ 4. Render & Sync  │
                                                             ▼                   │
┌───────────────────────────────────────────────────────────────────────────────┐ │
│                       Artifact State & Export Hub                             │─┘
│  - Version Snapshot Vault (v1, v2, v3 rollback & visual diff)                 │
│  - One-Click Binary Export (Download .docx / .pdf / .pptx / .xlsx)            │
│  - Copy Code / Raw Markdown / HTML Embed Code                                 │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Structure & Module Blueprint

```text
c:\Users\shrut\Desktop\Infianl.ai_2\infinall-chat\
├── app/
│   ├── api/
│   │   ├── artifacts/
│   │   │   ├── export/
│   │   │   │   ├── docx/route.ts               # Server-side DOCX compilation & download
│   │   │   │   ├── pdf/route.ts                # Server-side PDF rendering & stream
│   │   │   │   ├── pptx/route.ts               # Server-side PPTX generation
│   │   │   │   └── xlsx/route.ts               # Server-side multi-sheet Excel compilation
│   │   │   └── snapshot/
│   │   │       └── route.ts                    # Artifact version history & diff snapshot store
├── components/
│   ├── artifacts/
│   │   ├── ArtifactPanel.tsx                   # Master split container with tabbed header
│   │   ├── ArtifactHeader.tsx                  # Version pills, type badges, actions & download dropdown
│   │   ├── renderers/
│   │   │   ├── HtmlAppRenderer.tsx             # Sandboxed iframe with Tailwind & React compiler
│   │   │   ├── MarkdownDocumentEditor.tsx      # TipTap WYSIWYG document editor
│   │   │   ├── CodeEditorRenderer.tsx          # Syntax-highlighted code & diff viewer
│   │   │   ├── ChartRenderer.tsx               # Recharts interactive marketing dashboard
│   │   │   ├── MermaidDiagramRenderer.tsx      # Mermaid.js diagram & flowchart canvas
│   │   │   ├── SvgViewer.tsx                   # Vector graphic zoom & pan renderer
│   │   │   └── SpreadsheetViewer.tsx           # Interactive in-browser table / sheet grid
│   │   ├── controls/
│   │   │   ├── VersionHistoryModal.tsx         # Snapshot rollback, timeline & diff inspector
│   │   │   ├── ExportMenuDropdown.tsx          # Multi-format download menu (.docx, .pptx, .xlsx, .pdf)
│   │   │   └── ArtifactViewToggle.tsx          # Preview vs Code toggle with device mode switchers
├── lib/
│   ├── artifacts/
│   │   ├── interceptor.ts                      # Live token stream tag parser (<antArtifact>)
│   │   ├── types.ts                            # Universal artifact metadata, snapshot & format schemas
│   │   ├── version-store.ts                    # Immutable version tree and diff generator
│   │   ├── generators/
│   │   │   ├── docx-builder.ts                 # Executive document styles, tables, callout blocks
│   │   │   ├── pptx-builder.ts                 # 16:9 slide master templates, stat cards, bullets
│   │   │   ├── xlsx-builder.ts                 # Multi-tab financial models, formatting, formulas
│   │   │   └── pdf-builder.ts                  # Print layout, page numbers, header/footer styling
│   │   └── templates/
│   │       ├── paid-media-plan.ts              # Canonical media plan spreadsheet schema
│   │       ├── strategy-memo.ts                # Canonical marketing strategy docx structure
│   │       └── pitch-deck.ts                   # Canonical 10-slide growth presentation
├── tests/
│   └── artifact-suite.ts                       # Automated verification test suite for Phase 3
```

---

## 4. Technical Specifications & Implementation Details

### 4.1. Dual-Channel Stream Interceptor Engine

The LLM streams output in an interleaved format. Conversational commentary must appear in the chat panel, while structured documents must be intercepted and streamed in real-time to the artifact workspace.

#### Canonical XML Tag Protocol
```xml
I have created the Q3 Paid Media Budget & Forecasting Model for your team below:

<antArtifact identifier="q3-media-plan-2026" type="xlsx" title="Q3 2026 Paid Media Plan & Allocation">
```json
{
  "sheets": [
    {
      "name": "Summary & KPI Forecast",
      "data": [ ... ]
    }
  ]
}
```
</antArtifact>

Let me know if you would like me to adjust the target CPA assumptions.
```

#### Stream Interceptor State Machine (`lib/artifacts/interceptor.ts`)
The interceptor operates as an asynchronous transform stream that tracks four states:
1. `OUTSIDE_TAG`: Forwards token deltas to `text_delta` (left chat window).
2. `TAG_OPENING`: Buffers characters matching `<antArtifact` until attributes (`identifier`, `type`, `title`, `language`) are parsed. Emits `artifact_open`.
3. `INSIDE_TAG`: Forwards token deltas to `artifact_delta` (right artifact panel). Prevents artifact code from polluting the chat window.
4. `TAG_CLOSING`: Detects `</antArtifact>`, captures full content, computes SHA-256 content hash, creates version snapshot `v1`, and emits `artifact_complete`.

```typescript
export interface ArtifactState {
  id: string;
  type: 'html' | 'react' | 'markdown' | 'docx' | 'pptx' | 'xlsx' | 'code' | 'svg' | 'chart';
  title: string;
  language?: string;
  content: string;
  version: number;
  isStreaming: boolean;
  history: ArtifactSnapshot[];
}

export interface ArtifactSnapshot {
  version: number;
  timestamp: number;
  content: string;
  summary?: string;
}
```

---

### 4.2. Universal Multi-Format Renderers

#### 1. Interactive HTML & React App Renderer (`HtmlAppRenderer.tsx`)
- **Security Sandboxing**: Encapsulated in `<iframe sandbox="allow-scripts allow-forms allow-popups" />` with `srcdoc`.
- **Runtime Injection**: Pre-injects:
  - TailwindCSS CDN bundle (`cdn.tailwindcss.com`)
  - Lucide React Icon library
  - Inter & Outfit typography stylesheets
  - Polyfill for `window.parent.postMessage` telemetry.
- **Responsiveness Switcher**: Quick toggle buttons for **Desktop** (100%), **Tablet** (768px), and **Mobile** (375px) device viewport previews.

#### 2. TipTap WYSIWYG Markdown Document Studio (`MarkdownDocumentEditor.tsx`)
- **Bidirectional Sync**: Supports seamless switching between visual WYSIWYG editing and raw Markdown code view.
- **Enterprise Markdown Extensions**:
  - Full GitHub Flavored Markdown (GFM) tables with column resizing
  - Alert Callout blocks (`[!NOTE]`, `[!TIP]`, `[!WARNING]`, `[!IMPORTANT]`)
  - Task lists with interactive checkboxes
  - Math expressions & LaTeX blocks
  - Smart typography and footnote anchors.
- **User Edits as Agent Context**: When the user edits the document directly in the right pane, clicking "Update with AI" attaches the modified document snapshot as context for the next turn.

#### 3. Interactive Marketing Chart & Dashboard Renderer (`ChartRenderer.tsx`)
- Built with **Recharts** and tailored color tokens:
  - Multi-line trend charts (Spend vs ROAS over time)
  - Stacked bar charts (Channel CAC & Attribution)
  - Funnel conversion drop-off stages (Impressions -> Clicks -> MQLs -> SQLs -> Closed Won)
  - Heatmaps and Cohort retention matrices.

#### 4. Mermaid.js Flowchart & Diagram Canvas (`MermaidDiagramRenderer.tsx`)
- Renders automated marketing workflows:
  - Lead scoring pipelines
  - Multi-touch attribution flowcharts
  - Lifecycle email automation triggers
  - Zoom, pan, and SVG export controls.

---

### 4.3. Binary Document Generator Engine

#### 1. Native DOCX Builder (`lib/artifacts/generators/docx-builder.ts`)
Generates high-polish Microsoft Word `.docx` deliverables using the `docx` npm library:
- **Corporate Styling**: Header/footer with page numbers, company confidential badges, customized metadata.
- **Typography Hierarchy**: Deep slate `#0f172a` headings, indigo `#6366f1` subheaders, muted `#64748b` captions.
- **Formatted Tables**: Header rows with dark fill, striped alternating rows, subtle grid borders.
- **Callout Callboxes**: Border-left colored callout boxes for executive summaries and strategic recommendations.

#### 2. Native PPTX Deck Generator (`lib/artifacts/generators/pptx-builder.ts`)
Generates modern 16:9 widescreen presentation decks using `pptxgenjs`:
- **Slide Master Themes**: Modern Dark Mode (`#0a0a0c` canvas, `#22d3ee` accents) and Clean Corporate Light Mode.
- **Structured Slide Templates**:
  - *Title Slide*: Big impact typography, subtitle, author, and timestamp metadata.
  - *Executive Summary / Problem-Solution*: 3-column structured benefit cards.
  - *Metric / KPI Stat Cards*: Large 48pt stat numbers with percentage change indicators.
  - *Data Tables & Comparison Grids*: High-contrast formatted table slides.
  - *Roadmap / Timeline Slide*: 4-phase sequential timeline with milestone badges.

#### 3. Native Multi-Sheet XLSX Financial Model (`lib/artifacts/generators/xlsx-builder.ts`)
Generates live Excel workbooks using `exceljs` / `xlsx`:
- **Active Formulas**: `SUM`, `AVERAGE`, `VLOOKUP`, `IF`, `MAX`, `MIN` formulas preserved as native spreadsheet calculations.
- **Multi-Tab Architecture**:
  - *Tab 1: Executive KPI Summary* (Total Budget, Blended CPA, Target ROAS, Revenue Projection).
  - *Tab 2: Channel Budget Allocation* (Meta, Google Search, LinkedIn, TikTok, Programmatic).
  - *Tab 3: Unit Economics & CAC/LTV Model* (Conversion rates, payback period, churn rate).
  - *Tab 4: Campaign UTM Tracking Matrix* (Taxonomy parameters, naming conventions).
- **Styling & Protection**: Auto-fitted column widths, frozen header panes (`freezePanes`), currency/percentage number formatting (`$#,##0.00`, `0.0%`), and styled header fills.

#### 4. Pixel-Perfect PDF Compiler (`lib/artifacts/generators/pdf-builder.ts`)
- Server-side and browser canvas print generation.
- Supports custom page margins, automatic table page-breaks, cover page layout, and PDF table of contents bookmarks.

---

### 4.4. Artifact Lifecycle, Snapshot Versioning & Export Hub

#### Immutable Snapshot Version Tree (`lib/artifacts/version-store.ts`)
Every time an artifact is updated (by the agent in a multi-turn conversation or via manual user editing), a new immutable version is committed:
- `v1` (Initial generation)
- `v2` (Agent revised after prompt: "Add TikTok ads allocation")
- `v3` (User edited headline in WYSIWYG)

#### Capabilities:
1. **Version History Timeline**: Step backward or forward through any version with one click.
2. **Visual Diff Inspector**: Side-by-side or inline red/green line diff showing exact changes made between `v(N-1)` and `vN`.
3. **Rollback & Fork**: Instantly restore an earlier version or branch off into a new artifact.
4. **Universal Export Menu**:
   - `Download as Microsoft Word (.docx)`
   - `Download as PowerPoint Presentation (.pptx)`
   - `Download as Excel Spreadsheet (.xlsx)`
   - `Download as Print-Ready PDF (.pdf)`
   - `Download Raw Code / Markdown (.md, .html)`
   - `Copy to Clipboard`

---

## 5. API Routes & Endpoint Contract

### 5.1. Binary Export Endpoint: `POST /api/artifacts/export/[format]`

#### Formats Supported:
- `POST /api/artifacts/export/docx`
- `POST /api/artifacts/export/pptx`
- `POST /api/artifacts/export/xlsx`
- `POST /api/artifacts/export/pdf`

#### Request Payload:
```json
{
  "artifactId": "q3-media-plan-2026",
  "title": "Q3 2026 Paid Media Plan & Allocation",
  "type": "xlsx",
  "content": "{\"sheets\": [...]}",
  "formatOptions": {
    "theme": "dark",
    "includeCharts": true,
    "companyName": "Acme Marketing Corp"
  }
}
```

#### Response:
- `Content-Type`: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (or respective MIME type)
- `Content-Disposition`: `attachment; filename="Q3_2026_Paid_Media_Plan.xlsx"`
- Binary buffer stream.

---

## 6. Deterministic Benchmark & Acceptance Test Matrix

Phase 3 introduces an automated regression suite (`tests/artifact-suite.ts`) validating 12 deterministic criteria:

| Test ID | Area | Target Assertion | Pass Criteria |
| :--- | :--- | :--- | :--- |
| **A01** | **Stream Interceptor** | Tag Detection & Dual-Buffer Routing | `<antArtifact>` tokens stripped from chat text and routed to artifact buffer. |
| **A02** | **Stream Interceptor** | Stream Completion & SHA-256 Hash | Emits `artifact_complete` with identical fullContent and non-empty hash. |
| **A03** | **HTML/React Sandbox** | Iframe Security Isolation | `sandbox` attributes contain `allow-scripts`, strictly blocking parent DOM access. |
| **A04** | **HTML/React Sandbox** | Tailwind & Lucide Injection | Pre-injected scripts compile without unhandled JavaScript runtime errors. |
| **A05** | **DOCX Generator** | OpenXML Schema Integrity | Compiles valid `.docx` binary with headers, callout boxes, and tables. |
| **A06** | **XLSX Generator** | Multi-Sheet & Formula Preservation | Output contains valid `.xlsx` zip structure, multiple tabs, and computable formulas. |
| **A07** | **PPTX Generator** | 16:9 Widescreen Master Slides | Compiles 10-slide deck with valid XML structure, stat cards, and speaker notes. |
| **A08** | **PDF Generator** | Print Page-Break & Layout | Output produces valid `%PDF-1.4+` byte header with page numbering. |
| **A09** | **TipTap Editor** | GFM Table & Callout Serialization | Markdown round-trip preserves GFM table structure, callout alerts, and task lists. |
| **A10** | **Version Snapshot** | Immutable Snapshot History | Committing new content increments version (`v1` -> `v2`) without mutating `v1`. |
| **A11** | **Diff Generator** | Line-by-Line Delta Calculation | Accurately identifies added, removed, and unchanged lines between versions. |
| **A12** | **Export API Router** | Binary Header & MIME Validation | API routes return correct `Content-Type` and `Content-Disposition` attachment headers. |

---

## 7. Implementation Roadmap & Execution Checklist

- [ ] **Step 1: Core Stream Interceptor & Dual-Channel Buffer**
  - Implement `lib/artifacts/interceptor.ts` state machine.
  - Connect `SplitWorkspace.tsx` to handle `artifact_open`, `artifact_delta`, `artifact_complete`.
- [ ] **Step 2: Universal Multi-Format Renderers**
  - Implement `HtmlAppRenderer.tsx` with responsive viewport controls.
  - Implement `MarkdownDocumentEditor.tsx` with TipTap WYSIWYG & GFM tables.
  - Implement `CodeEditorRenderer.tsx` with syntax highlighting and line numbers.
  - Implement `ChartRenderer.tsx` and `MermaidDiagramRenderer.tsx`.
- [ ] **Step 3: Binary Document Generators**
  - Implement `docx-builder.ts` for executive strategy briefs.
  - Implement `pptx-builder.ts` for 16:9 presentation slide decks.
  - Implement `xlsx-builder.ts` for multi-tab financial and media planning spreadsheets.
  - Implement `pdf-builder.ts` for print-ready documents.
- [ ] **Step 4: Artifact Header, Versioning & Export Hub**
  - Build `ArtifactHeader.tsx` with version badges (`v1`, `v2`), type pills, and preview/code switcher.
  - Build `VersionHistoryModal.tsx` with diff inspector.
  - Build `ExportMenuDropdown.tsx` and API export routes (`/api/artifacts/export/*`).
- [ ] **Step 5: Automated Verification & Browser Testing**
  - Create and execute `tests/artifact-suite.ts` (12/12 assertions passing).
  - Verify live artifact generation, tab switching, and one-click downloads in browser.

---

*This specification defines the complete production blueprint for Phase 3: Universal Multi-Format Artifacts Workspace & Document Generators.*
