// ============================================================
// Markdown Renderer Utility for Chat & Artifacts
// Claude-Tier Table, Typography & List Styling
// ============================================================

export function renderMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';

  // 1. Normalize line endings
  let text = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Escape HTML entities
  text = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 3. Fenced Code blocks ```lang\ncode\n```
  text = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    return `<div class="rounded-xl my-4 overflow-hidden border border-zinc-800 bg-[#18181b] shadow-sm"><div class="flex items-center justify-between px-4 py-2 border-b border-zinc-800/80 bg-zinc-900/60 text-[11px] font-mono text-zinc-400 font-medium uppercase tracking-wider"><span>${lang || 'code'}</span></div><pre class="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed text-zinc-200 bg-transparent m-0"><code>${code.trim()}</code></pre></div>`;
  });

  // 4. Line-by-Line Table Parser (Claude-Style Clean Borderless Horizontal Rows)
  const lines = text.split('\n');
  const output: string[] = [];
  let tableRows: string[] = [];

  const isTableRow = (line: string): boolean => {
    const trimmed = line.trim();
    return (trimmed.startsWith('|') && trimmed.endsWith('|')) || (trimmed.includes('|') && !trimmed.startsWith('```') && !trimmed.startsWith('#'));
  };

  const isDelimiterRow = (line: string): boolean => {
    const trimmed = line.trim();
    return /^\|?[\s:-]+(\|-+[\s:-]*)+\|?$/.test(trimmed) || /^[\s:-]+\|[\s:-|]+$/.test(trimmed);
  };

  const parseCells = (line: string): string[] => {
    let trimmed = line.trim();
    if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
    if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
    return trimmed.split('|').map((c) => c.trim());
  };

  const flushTable = () => {
    if (tableRows.length < 2) {
      output.push(...tableRows);
      tableRows = [];
      return;
    }

    const headerRowIdx = 0;
    let delimiterRowIdx = 1;

    if (!isDelimiterRow(tableRows[1]) && tableRows.length >= 3 && isDelimiterRow(tableRows[2])) {
      delimiterRowIdx = 2;
    }

    const headerCells = parseCells(tableRows[headerRowIdx]);
    const bodyRows = tableRows.slice(delimiterRowIdx + 1);

    const ths = headerCells
      .map(
        (c) =>
          `<th class="px-5 py-3 text-left font-semibold text-sm text-zinc-100 border-b border-zinc-800 bg-[#1c1c20] tracking-tight">${formatInline(c)}</th>`
      )
      .join('');

    const trs = bodyRows
      .map((row) => {
        const cells = parseCells(row);
        const tds = cells
          .map(
            (c, i) =>
              `<td class="px-5 py-3.5 text-sm ${i === 0 ? 'font-medium text-zinc-200' : 'text-zinc-300'} border-b border-zinc-800/60 leading-relaxed">${formatInline(c)}</td>`
          )
          .join('');
        return `<tr class="hover:bg-zinc-800/30 transition-colors">${tds}</tr>`;
      })
      .join('');

    output.push(
      `<div class="my-5 overflow-x-auto rounded-xl border border-zinc-800/80 bg-[#18181b]/70 shadow-sm"><table class="w-full border-collapse text-left"><thead><tr>${ths}</tr></thead><tbody class="divide-y divide-zinc-800/40">${trs}</tbody></table></div>`
    );

    tableRows = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isTableRow(line)) {
      tableRows.push(line);
    } else {
      if (tableRows.length > 0) {
        flushTable();
      }
      output.push(line);
    }
  }

  if (tableRows.length > 0) {
    flushTable();
  }

  text = output.join('\n');

  // 5. Blockquotes (Claude styled accent callout)
  text = text.replace(/^&gt;\s+(.+)$/gm, '<blockquote class="border-l-2 border-amber-500 pl-4 py-1 my-3 text-zinc-300 italic text-sm leading-relaxed">$1</blockquote>');

  // 6. Headings (Clean modern Claude typography)
  text = text
    .replace(/^#### (.+)$/gm, '<h4 class="text-sm font-semibold text-zinc-200 mt-4 mb-1.5 tracking-tight">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-zinc-100 mt-5 mb-2 tracking-tight">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-zinc-100 mt-6 mb-2.5 tracking-tight border-b border-zinc-800/60 pb-1.5">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-zinc-50 mt-6 mb-3 tracking-tight border-b border-zinc-700/80 pb-2">$1</h1>');

  // 7. Horizontal rules
  text = text.replace(/^---$/gm, '<hr class="my-5 border-zinc-800" />');

  // 8. Bullet & Numbered Lists
  text = text.replace(/^[-*]\s+(.+)$/gm, '<li class="ml-5 list-disc text-zinc-300 text-sm leading-relaxed my-1">$1</li>');
  text = text.replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-5 list-decimal text-zinc-300 text-sm leading-relaxed my-1">$1</li>');

  // 9. Inline formatting
  text = formatInline(text);

  // 10. Paragraph breaks
  text = text.replace(/\n\n/g, '<div class="h-3.5"></div>');

  return text;
}

function formatInline(str: string): string {
  return str
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-zinc-100">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic text-zinc-200">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded text-xs font-mono bg-zinc-800/90 text-amber-300 border border-zinc-700/50">$1</code>')
    // Citations like [1] or [^1]
    .replace(/\[\^?(\d+)\]/g, '<sup class="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 mx-0.5 cursor-pointer hover:bg-cyan-500/40 transition-colors" title="Citation source #$1">$1</sup>')
    // Clickable external links
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 inline-flex items-center gap-0.5 font-medium transition-colors">$1 <span class="text-[10px]">↗</span></a>');
}
