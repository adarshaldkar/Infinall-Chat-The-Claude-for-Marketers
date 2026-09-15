// ============================================================
// Infinall Chat - Comprehensive Ingestion Registry Test Suite
// Validates all parsers & security guardrails
// ============================================================

import { ParserRegistry } from '@/lib/ingestion/registry';
import { DocxBuilder } from '@/lib/artifacts/generators/docx-builder';
import { XlsxBuilder } from '@/lib/artifacts/generators/xlsx-builder';
import { PptxBuilder } from '@/lib/artifacts/generators/pptx-builder';
import { PdfBuilder } from '@/lib/artifacts/generators/pdf-builder';

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string, detail: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`✅ [PASS] ${testName}: ${detail}`);
  } else {
    console.error(`❌ [FAIL] ${testName}: ${detail}`);
  }
}

async function runTestSuite() {
  console.log('========================================================');
  console.log('🧪 Running Document Ingestion & Parser Registry Suite');
  console.log('========================================================\n');

  // Test 1: Registered Parsers Count
  const registered = ParserRegistry.getRegisteredParsers();
  assert(registered.length >= 12, 'T01_REGISTRY_COUNT', `Found ${registered.length} registered parser adapters`);

  // Test 2: Markdown Document Parsing
  const mdBuffer = Buffer.from('# Marketing Strategy 2026\n\n## Target Audience\n- B2B Marketers\n- Growth Leads\n\n| Feature | Score |\n| Quality | 100% |\n');
  const mdResult = await ParserRegistry.resolveAndParse({
    fileName: 'strategy.md',
    buffer: mdBuffer,
    mimeType: 'text/markdown',
    sizeBytes: mdBuffer.length,
  });
  assert(mdResult.ok, 'T02_MARKDOWN_PARSE', 'Markdown parsed successfully');
  if (mdResult.ok) {
    assert(mdResult.document.sections.length >= 2, 'T02_MARKDOWN_SECTIONS', `Extracted ${mdResult.document.sections.length} markdown sections`);
    assert(mdResult.document.sourceType === 'markdown', 'T02_MARKDOWN_TYPE', 'Correct sourceType: markdown');
  }

  // Test 3: CSV Document Parsing with Semantic Records
  const csvBuffer = Buffer.from('Campaign,Spend,CTR,Conversion\nSummer Promo,15000,3.4%,7.1%\nRetargeting,8000,4.2%,9.5%\n');
  const csvResult = await ParserRegistry.resolveAndParse({
    fileName: 'campaigns.csv',
    buffer: csvBuffer,
    mimeType: 'text/csv',
    sizeBytes: csvBuffer.length,
  });
  assert(csvResult.ok, 'T03_CSV_PARSE', 'CSV parsed successfully');
  if (csvResult.ok) {
    assert(csvResult.document.sheets?.[0]?.rowCount === 2, 'T03_CSV_ROW_COUNT', 'Parsed 2 data rows');
    assert(csvResult.document.text.includes('Semantic Records'), 'T03_CSV_SEMANTIC_RECORDS', 'Converted tabular rows to semantic records');
  }

  // Test 4: HTML Semantic Parser
  const htmlBuffer = Buffer.from('<html><head><title>Product Landing</title></head><body><script>alert(1)</script><nav>Nav</nav><h1>Campaign Hero</h1><p>High converting copy.</p></body></html>');
  const htmlResult = await ParserRegistry.resolveAndParse({
    fileName: 'landing.html',
    buffer: htmlBuffer,
    mimeType: 'text/html',
    sizeBytes: htmlBuffer.length,
  });
  assert(htmlResult.ok, 'T04_HTML_PARSE', 'HTML parsed successfully');
  if (htmlResult.ok) {
    assert(!htmlResult.document.text.includes('alert(1)'), 'T04_HTML_SCRIPT_STRIPPED', 'Script tags successfully stripped');
    assert(htmlResult.document.text.includes('Campaign Hero'), 'T04_HTML_HERO_PRESERVED', 'Semantic headings preserved');
  }

  // Test 5: JSON Dataset Parser
  const jsonBuffer = Buffer.from(JSON.stringify({ platform: 'Infinall', version: '2.0', metrics: { activeUsers: 45000 } }));
  const jsonResult = await ParserRegistry.resolveAndParse({
    fileName: 'metrics.json',
    buffer: jsonBuffer,
    mimeType: 'application/json',
    sizeBytes: jsonBuffer.length,
  });
  assert(jsonResult.ok, 'T05_JSON_PARSE', 'JSON parsed successfully');
  if (jsonResult.ok) {
    assert(jsonResult.document.sections.length >= 2, 'T05_JSON_SECTIONS', 'Extracted structured sections from JSON keys');
  }

  // Test 6: DOCX Binary Document Parser
  const sampleDocx = await DocxBuilder.buildDocument({
    title: 'Brand Positioning Document',
    content: '# Strategic Pillars\n\n## Core Values\n- Value 1\n- Value 2\n\n| Strategy | Focus |\n| Organic | SEO |\n',
  });
  const docxResult = await ParserRegistry.resolveAndParse({
    fileName: 'brand_positioning.docx',
    buffer: sampleDocx,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: sampleDocx.length,
  });
  assert(docxResult.ok, 'T06_DOCX_PARSE', 'Binary DOCX parsed successfully');
  if (docxResult.ok) {
    assert(docxResult.document.text.includes('Core Values') || docxResult.document.text.includes('Value 1'), 'T06_DOCX_TEXT', 'Extracted docx text content');
  }

  // Test 7: PPTX Binary Presentation Parser
  const samplePptx = await PptxBuilder.buildPresentation({
    title: 'Quarterly Growth Deck',
    content: '# Executive Vision\n\n## Slide 1: Market Opportunity\n- $40B Total Addressable Market\n- 85% YoY Growth\n',
  });
  const pptxResult = await ParserRegistry.resolveAndParse({
    fileName: 'growth_deck.pptx',
    buffer: samplePptx,
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    sizeBytes: samplePptx.length,
  });
  assert(pptxResult.ok, 'T07_PPTX_PARSE', 'Binary PPTX parsed successfully');
  if (pptxResult.ok) {
    assert((pptxResult.document.slides?.length || 0) >= 1, 'T07_PPTX_SLIDES', `Extracted ${pptxResult.document.slides?.length} slides`);
  }

  // Test 8: XLSX Binary Spreadsheet Parser
  const sampleXlsx = await XlsxBuilder.buildWorkbook('# Performance\n\n| Channel | CAC | LTV |\n| Paid Search | $120 | $950 |\n| Social Ads | $85 | $620 |\n');
  const xlsxResult = await ParserRegistry.resolveAndParse({
    fileName: 'performance.xlsx',
    buffer: sampleXlsx,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sizeBytes: sampleXlsx.length,
  });
  assert(xlsxResult.ok, 'T08_XLSX_PARSE', 'Binary XLSX parsed successfully');
  if (xlsxResult.ok) {
    assert((xlsxResult.document.sheets?.length || 0) >= 1, 'T08_XLSX_SHEETS', `Extracted ${xlsxResult.document.sheets?.length} sheets`);
  }

  // Test 9: PDF Binary Document Parser
  const samplePdf = await PdfBuilder.buildPdf({
    title: 'Executive Briefing',
    content: '# Strategic Pillars\n- Brand Integrity\n- Scalable Demand Generation\n',
  });
  const pdfResult = await ParserRegistry.resolveAndParse({
    fileName: 'executive_brief.pdf',
    buffer: samplePdf,
    mimeType: 'application/pdf',
    sizeBytes: samplePdf.length,
  });
  assert(pdfResult.ok, 'T09_PDF_PARSE', 'Binary PDF parsed successfully');
  if (pdfResult.ok) {
    assert((pdfResult.document.pages?.length || 0) >= 1, 'T09_PDF_PAGES', `Extracted ${pdfResult.document.pages?.length} pages`);
  }

  // Test 10: Security Size Check (Oversized Rejection)
  const bigBuffer = Buffer.alloc(55 * 1024 * 1024); // 55MB exceeds 50MB limit
  const bigResult = await ParserRegistry.resolveAndParse({
    fileName: 'huge.pdf',
    buffer: bigBuffer,
    mimeType: 'application/pdf',
    sizeBytes: bigBuffer.length,
  });
  assert(!bigResult.ok && bigResult.code === 'FILE_TOO_LARGE', 'T10_SECURITY_SIZE_LIMIT', 'Oversized file rejected with FILE_TOO_LARGE');

  console.log('\n========================================================');
  console.log(`📊 Ingestion Registry Result: ${passed}/${total} assertions PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================================');

  if (passed !== total) process.exit(1);
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
