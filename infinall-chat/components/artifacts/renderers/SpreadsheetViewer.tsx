"use client";

import { useState, useMemo } from "react";
import { SpreadsheetWorkbookPayload, SpreadsheetSheetData } from "@/lib/artifacts/types";
import { Table, Layers, FileSpreadsheet } from "lucide-react";

interface SpreadsheetViewerProps {
  content: string;
}

export default function SpreadsheetViewer({ content }: SpreadsheetViewerProps) {
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  const workbook = useMemo<SpreadsheetWorkbookPayload>(() => {
    try {
      let clean = content.trim();
      if (clean.startsWith("```json")) {
        clean = clean.replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
      } else if (clean.startsWith("```")) {
        clean = clean.replace(/^```\w*\s*/i, "").replace(/```\s*$/i, "");
      }
      const parsed = JSON.parse(clean);
      if (parsed.sheets && Array.isArray(parsed.sheets)) {
        return parsed;
      }
      return { sheets: [parsed] };
    } catch {
      // Parse markdown table to sheet
      const lines = content.split("\n").filter((l) => l.trim().startsWith("|"));
      if (lines.length >= 2) {
        const headers = lines[0]
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());
        const rows: Array<Array<string | number>> = [];
        for (let i = 2; i < lines.length; i++) {
          const cells = lines[i]
            .split("|")
            .slice(1, -1)
            .map((c) => {
              const trimmed = c.trim();
              const num = Number(trimmed.replace(/[$,%]/g, ""));
              return !isNaN(num) && trimmed !== "" ? num : trimmed;
            });
          if (cells.length > 0) rows.push(cells);
        }
        return {
          sheets: [{ name: "Media Plan Summary", headers, rows }],
        };
      }
      return {
        sheets: [
          {
            name: "Sheet 1",
            headers: ["Column A", "Column B", "Column C"],
            rows: [["Data 1", "Data 2", "Data 3"]],
          },
        ],
      };
    }
  }, [content]);

  const activeSheet: SpreadsheetSheetData = workbook.sheets[activeSheetIndex] || workbook.sheets[0];

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Tab Switcher */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b text-xs shrink-0"
        style={{ borderColor: "var(--color-border)", background: "rgba(0,0,0,0.3)" }}
      >
        <div className="flex items-center gap-1 overflow-x-auto">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400 mr-1.5 shrink-0" />
          {workbook.sheets.map((sheet, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSheetIndex(idx)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeSheetIndex === idx
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              <Layers className="w-3 h-3" />
              {sheet.name || `Sheet ${idx + 1}`}
            </button>
          ))}
        </div>

        <div className="text-[11px] text-zinc-500 shrink-0 ml-2">
          {activeSheet?.rows?.length || 0} rows · {activeSheet?.headers?.length || 0} cols
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <div className="flex-1 overflow-auto p-4 bg-zinc-950">
        <div className="inline-block min-w-full align-middle border border-zinc-800 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-zinc-800 text-xs text-left">
            {activeSheet.headers && activeSheet.headers.length > 0 && (
              <thead className="bg-zinc-900 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5 text-center text-zinc-500 font-mono text-[10px] w-10 border-r border-zinc-800 bg-zinc-900/90">
                    #
                  </th>
                  {activeSheet.headers.map((h, i) => (
                    <th
                      key={i}
                      className="px-4 py-2.5 text-zinc-200 font-semibold uppercase tracking-wider border-r border-zinc-800 last:border-r-0"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-zinc-800/60 bg-zinc-950">
              {(activeSheet.rows || []).map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="px-3 py-2 text-center text-zinc-600 font-mono text-[10px] border-r border-zinc-800 bg-zinc-900/30">
                    {rIdx + 1}
                  </td>
                  {row.map((cell, cIdx) => {
                    const isFormula = typeof cell === "object" && cell !== null && "formula" in cell;
                    const displayVal = isFormula ? `fx ${(cell as { formula: string }).formula}` : String(cell ?? "");
                    const isNumber = typeof cell === "number";

                    return (
                      <td
                        key={cIdx}
                        className={`px-4 py-2 border-r border-zinc-800/60 last:border-r-0 whitespace-nowrap font-mono ${
                          isFormula
                            ? "text-cyan-400 italic bg-cyan-950/10 font-medium"
                            : isNumber
                            ? "text-emerald-400 text-right font-medium"
                            : "text-zinc-300"
                        }`}
                      >
                        {displayVal}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
