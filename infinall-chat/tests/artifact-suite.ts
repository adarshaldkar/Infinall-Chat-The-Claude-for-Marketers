// ============================================================
// Phase 3 Deterministic Benchmark & Regression Suite
// Validates Universal Artifacts, Stream Interceptor, Binary Generators,
// Version Store, and Renderer Integrity.
// ============================================================

import './helpers/env';
import { ArtifactInterceptor } from '../lib/artifacts/interceptor';
import { ArtifactVersionStore } from '../lib/artifacts/version-store';
import { DocxBuilder } from '../lib/artifacts/generators/docx-builder';
import { XlsxBuilder } from '../lib/artifacts/generators/xlsx-builder';
import { PptxBuilder } from '../lib/artifacts/generators/pptx-builder';
import { PdfBuilder } from '../lib/artifacts/generators/pdf-builder';
import { renderMarkdownToHtml } from '../lib/utils/markdown';

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, testId: string, description: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`✅ [PASS] ${testId}: ${description}`);
  } else {
    console.error(`❌ [FAIL] ${testId}: ${description}`);
    throw new Error(`Assertion failed: ${testId} - ${description}`);
  }
}

async function runPhase3Benchmark() {
  console.log('========================================================');
  console.log('🧪 Running Phase 3 Universal Artifacts Benchmark Suite');
  console.log('========================================================\n');

  // --- Test A01: Stream Interceptor Tag Detection & Dual-Buffer Routing ---
  console.log('--- Test A01: Stream Interceptor Tag Parsing ---');
  const interceptor = new ArtifactInterceptor();
  const chunk1 = 'Here is the strategic plan:\n\n<antArtifact identifier="strat-1" type="markdown" title="Q3 Marketing Strategy">\n# Executive Summary\nTargeting high ROAS channels.';
  const chunk2 = '\n\n## Budget Allocation\nAllocate $50k to Meta Ads.\n</antArtifact>\n\nLet me know what you think!';

  const events1 = interceptor.processDelta(chunk1);
  const textEvents1 = events1.filter((e) => e.type === 'text_delta');
  const openEvents1 = events1.filter((e) => e.type === 'artifact_open');

  assert(openEvents1.length === 1, 'A01.1', '<antArtifact> opening tag detected and emitted artifact_open');
  assert(openEvents1[0].type === 'artifact_open' && openEvents1[0].payload.title === 'Q3 Marketing Strategy', 'A01.2', 'Artifact title extracted accurately');
  assert(textEvents1.length >= 1, 'A01.3', 'Text preceding artifact routed to text_delta for chat stream');

  // --- Test A02: Stream Interceptor Tag Completion ---
  console.log('\n--- Test A02: Stream Interceptor Completion ---');
  const events2 = interceptor.processDelta(chunk2);
  const completeEvents2 = events2.filter((e) => e.type === 'artifact_complete');
  const postChatEvents2 = events2.filter((e) => e.type === 'text_delta');

  assert(completeEvents2.length === 1, 'A02.1', '</antArtifact> closing tag emitted artifact_complete');
  assert(completeEvents2[0].type === 'artifact_complete' && completeEvents2[0].payload.fullContent.includes('Allocate $50k to Meta Ads.'), 'A02.2', 'Full artifact content captured');
  assert(postChatEvents2.length >= 1, 'A02.3', 'Text after closing tag routed back to chat window');

  // --- Test A03: Standard <artifact> Tag Fallback ---
  console.log('\n--- Test A03: Standard <artifact> Tag Support ---');
  interceptor.reset();
  const standardChunk = '<artifact type="html" title="Interactive ROI Calculator">\n<div class="calculator">ROI App</div>\n</artifact>';
  const standardEvents = interceptor.processDelta(standardChunk);
  const hasStandardOpen = standardEvents.some((e) => e.type === 'artifact_open' && e.payload.type === 'html');
  const hasStandardComplete = standardEvents.some((e) => e.type === 'artifact_complete');

  assert(hasStandardOpen && hasStandardComplete, 'A03', 'Standard <artifact> tag format parsed seamlessly');

  // --- Test A04: Version Store Immutable Snapshots ---
  console.log('\n--- Test A04: Version Store Immutable Snapshots ---');
  ArtifactVersionStore.clear();
  const snap1 = ArtifactVersionStore.commit('media-plan-1', 'Initial Media Plan v1', 'Created Q3 plan');
  const snap2 = ArtifactVersionStore.commit('media-plan-1', 'Revised Media Plan v2 with TikTok', 'Added TikTok channel');

  assert(snap1.version === 1 && snap2.version === 2, 'A04.1', 'Version counter automatically increments (v1 -> v2)');
  assert(ArtifactVersionStore.getHistory('media-plan-1').length === 2, 'A04.2', 'Version history persists all historical snapshots');
  assert(ArtifactVersionStore.getVersion('media-plan-1', 1)?.content === 'Initial Media Plan v1', 'A04.3', 'Historical snapshot v1 remains immutable');

  // --- Test A05: Line-by-Line Diff Engine ---
  console.log('\n--- Test A05: Line-by-Line Diff Calculation ---');
  const oldText = 'Line 1: Budget $10,000\nLine 2: Meta Ads\nLine 3: Google Ads';
  const newText = 'Line 1: Budget $10,000\nLine 2: Meta Ads & TikTok\nLine 3: Google Ads\nLine 4: LinkedIn Ads';
  const diff = ArtifactVersionStore.computeDiff(oldText, newText);

  assert(diff.some((d) => d.type === 'added' && d.content.includes('LinkedIn Ads')), 'A05.1', 'Diff identifies newly added line');
  assert(diff.some((d) => d.type === 'unchanged' && d.content.includes('Line 1: Budget $10,000')), 'A05.2', 'Diff marks unmodified lines as unchanged');

  // --- Test A06: DOCX Binary Generation ---
  console.log('\n--- Test A06: DOCX Binary Document Compilation ---');
  const docxBuffer = await DocxBuilder.buildDocument({
    title: 'Executive Marketing Strategy',
    subtitle: 'Q3 Growth Blueprint',
    companyName: 'Infinall Client Corp',
    sections: [
      {
        heading: 'Strategic Overview',
        callout: 'Blended CPA decreased by 28% following creative refresh.',
        paragraphs: ['We recommend scaling top-performing Meta Lookalikes.'],
        table: {
          headers: ['Channel', 'Spend', 'Target CPA', 'ROAS'],
          rows: [
            ['Meta Ads', '$25,000', '$42.00', '3.8x'],
            ['Google Search', '$35,000', '$58.00', '4.2x'],
          ],
        },
      },
    ],
  });

  assert(Buffer.isBuffer(docxBuffer) && docxBuffer.length > 2000, 'A06.1', 'DOCX binary generated with non-empty buffer');
  // Check ZIP/OpenXML magic number header (PK\x03\x04)
  assert(docxBuffer[0] === 0x50 && docxBuffer[1] === 0x4b, 'A06.2', 'DOCX contains valid OpenXML ZIP binary signature');

  // --- Test A07: XLSX Multi-Sheet & Formula Generation ---
  console.log('\n--- Test A07: XLSX Multi-Sheet Excel Compilation ---');
  const xlsxBuffer = await XlsxBuilder.buildWorkbook({
    title: 'Q3 Media Plan',
    sheets: [
      {
        name: 'Channel Breakdown',
        headers: ['Channel', 'Monthly Spend', 'Target CPA', 'Projected Leads'],
        rows: [
          ['Meta Ads', 15000, 50, 300],
          ['Google Ads', 20000, 65, 307],
          ['Total', { formula: 'SUM(B2:B3)' }, 57.5, { formula: 'SUM(D2:D3)' }],
        ],
      },
      {
        name: 'Unit Economics',
        headers: ['Metric', 'Value'],
        rows: [
          ['Customer LTV', 1200],
          ['Target CAC', 250],
          ['LTV/CAC Ratio', 4.8],
        ],
      },
    ],
  });

  assert(Buffer.isBuffer(xlsxBuffer) && xlsxBuffer.length > 2000, 'A07.1', 'XLSX binary generated with multi-sheet workbook');
  assert(xlsxBuffer[0] === 0x50 && xlsxBuffer[1] === 0x4b, 'A07.2', 'XLSX contains valid OpenXML ZIP binary signature');

  // --- Test A08: PPTX 16:9 Presentation Deck Generation ---
  console.log('\n--- Test A08: PPTX 16:9 Presentation Deck Compilation ---');
  const pptxBuffer = await PptxBuilder.buildPresentation({
    title: 'Q3 Growth Marketing Pitch',
    theme: 'dark',
    slides: [
      {
        title: 'Q3 Marketing Pitch',
        subtitle: 'Scaling Efficient Acquisition',
        layout: 'title',
      },
      {
        title: 'Key Performance Highlights',
        layout: 'stats',
        statCards: [
          { label: 'Blended ROAS', value: '4.2x', subtext: '+18% MoM' },
          { label: 'Customer Acquisition Cost', value: '$45.20', subtext: '-12% reduction' },
          { label: 'New Revenue Generated', value: '$840K', subtext: 'Exceeded target by 14%' },
        ],
      },
      {
        title: 'Strategic Priorities',
        layout: 'content',
        bulletPoints: [
          'Scale high-intent Google Search campaigns for commercial keywords',
          'Deploy Advantage+ shopping campaigns with video UGC assets',
          'Implement automated lead scoring workflow in CRM',
        ],
        speakerNotes: 'Highlight that creative testing was the primary driver of ROAS improvement.',
      },
    ],
  });

  assert(Buffer.isBuffer(pptxBuffer) && pptxBuffer.length > 2000, 'A08.1', 'PPTX binary generated with valid presentation buffer');
  assert(pptxBuffer[0] === 0x50 && pptxBuffer[1] === 0x4b, 'A08.2', 'PPTX contains valid OpenXML presentation signature');

  // --- Test A09: PDF Document Compilation ---
  console.log('\n--- Test A09: PDF Document Compilation ---');
  const pdfBuffer = await PdfBuilder.buildPdf({
    title: 'Marketing ROI Executive Brief',
    subtitle: 'Prepared for Marketing Leadership',
    content: '# Executive Summary\nOur omnichannel marketing campaigns delivered a 4.1x blended return on ad spend.\n\n## Next Steps\nExpand into programmatic retargeting.',
  });

  assert(Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 1000, 'A09.1', 'PDF binary compiled with valid size');
  // PDF Magic byte header: "%PDF"
  const pdfHeader = pdfBuffer.slice(0, 4).toString('utf-8');
  assert(pdfHeader === '%PDF', 'A09.2', 'PDF binary contains valid %PDF magic header');

  // --- Test A10: Markdown GFM Table Rendering ---
  console.log('\n--- Test A10: Markdown Table & Typography Rendering ---');
  const sampleMarkdown = `
| Parameter | Meta Ads | Google Ads |
| :--- | :--- | :--- |
| **Daily Budget** | $500/day | $800/day |
| **Primary Goal** | Retargeting | High-Intent Search |
`;
  const renderedHtml = renderMarkdownToHtml(sampleMarkdown);

  assert(renderedHtml.includes('<table') && renderedHtml.includes('<th') && renderedHtml.includes('<td'), 'A10.1', 'Markdown table compiles into HTML table elements');
  assert(renderedHtml.includes('Meta Ads') && renderedHtml.includes('Google Ads'), 'A10.2', 'Table cell contents preserved cleanly');

  // --- Summary ---
  console.log('\n========================================================');
  console.log(`📊 Phase 3 Benchmark Suite Result: ${passedCount}/${totalCount} assertions PASSED (100%)`);
  console.log('========================================================\n');
}

runPhase3Benchmark().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
