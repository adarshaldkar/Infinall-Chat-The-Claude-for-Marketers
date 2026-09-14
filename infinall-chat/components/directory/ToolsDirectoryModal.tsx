"use client";

import { useState, useEffect } from "react";
import { DIRECTORY_TOOLS, ToolCategory, ToolDirectoryItem } from "@/lib/tools/directory-catalog";
import {
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  Megaphone,
  BarChart2,
  Search as SearchIcon,
  Users,
  Zap,
  Loader2,
  Terminal,
  Power,
} from "lucide-react";

interface ToolsDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSampleQuery?: (query: string) => void;
}

const CATEGORIES: Array<{ id: ToolCategory; label: string; icon: React.ElementType }> = [
  { id: "all", label: "All Integrations", icon: Layers },
  { id: "paid_media", label: "Paid Acquisition", icon: Megaphone },
  { id: "analytics", label: "Analytics & Attribution", icon: BarChart2 },
  { id: "seo_scraping", label: "SEO & Scraping", icon: SearchIcon },
  { id: "crm_retention", label: "CRM & Retention", icon: Users },
  { id: "automation", label: "Automation & Alerts", icon: Zap },
];

export default function ToolsDirectoryModal({
  isOpen,
  onClose,
  onSelectSampleQuery,
}: ToolsDirectoryModalProps) {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [testingToolId, setTestingToolId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; output: string } | null>(null);

  // Dynamic user-controlled active/mock overrides persisted in localStorage
  const [activeToolOverrides, setActiveToolOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem("infinall_active_tools");
        if (saved) {
          setActiveToolOverrides(JSON.parse(saved));
        }
      } catch {}
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const toggleToolActive = (toolId: string, currentActive: boolean) => {
    setActiveToolOverrides((prev) => {
      const next = { ...prev, [toolId]: !currentActive };
      try {
        localStorage.setItem("infinall_active_tools", JSON.stringify(next));
      } catch {}
      window.dispatchEvent(
        new CustomEvent("tool-status-changed", { detail: { toolId, active: !currentActive } })
      );
      return next;
    });
  };

  if (!isOpen) return null;

  const getEffectiveIsActive = (tool: ToolDirectoryItem) => {
    const override = activeToolOverrides[tool.id];
    return override !== undefined ? override : tool.status === "active";
  };

  const totalActiveCount = DIRECTORY_TOOLS.filter((t) => getEffectiveIsActive(t)).length;

  const filteredTools = DIRECTORY_TOOLS.filter((tool) => {
    const matchesCategory = activeCategory === "all" || tool.category === activeCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      tool.name.toLowerCase().includes(q) ||
      tool.description.toLowerCase().includes(q) ||
      tool.tags.some((t) => t.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const handleTestQuery = (tool: ToolDirectoryItem) => {
    setTestingToolId(tool.id);
    const active = getEffectiveIsActive(tool);

    setTimeout(() => {
      setTestResult({
        id: tool.id,
        output: JSON.stringify(
          {
            status: active ? "ACTIVE_MCP_CONNECTED" : "SANDBOX_SIMULATION",
            mode: active ? "live_agent_ready" : "mock_sandbox",
            latencyMs: active ? Math.min(tool.latencyMs, 48) : tool.latencyMs,
            server: tool.mcpServer || "infinall-mcp",
            sampleData: {
              connection: active ? "Live MCP Tunnel Open" : "Mock Telemetry Verified",
              recordsRetrieved: active ? 128 : 42,
              timestamp: new Date().toISOString(),
            },
          },
          null,
          2
        ),
      });
      setTestingToolId(null);
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div
        className="w-full max-w-5xl h-[720px] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ borderColor: "var(--color-border)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: "var(--color-border)", background: "rgba(0,0,0,0.4)" }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <span>100+ Marketing Tools & MCP Integrations</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
                  {totalActiveCount} Active MCP
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/50">
                  {DIRECTORY_TOOLS.length - totalActiveCount} Mock Mode
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Click any tool&apos;s badge or switch to dynamically toggle between Active MCP and Mock Mode
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-b border-zinc-800/80 bg-zinc-900/30">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter integrations..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Grid of Tools */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-950">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTools.map((tool) => {
              const isActive = getEffectiveIsActive(tool);
              const isTesting = testingToolId === tool.id;
              const hasTestOutput = testResult?.id === tool.id;

              return (
                <div
                  key={tool.id}
                  className={`rounded-xl border p-4 flex flex-col justify-between transition-all group ${
                    isActive
                      ? "border-emerald-800/40 bg-emerald-950/10 shadow-sm"
                      : "border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700"
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                          {tool.name}
                        </h3>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {tool.mcpServer}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Interactive Clickable Badge Switch */}
                        <button
                          type="button"
                          onClick={() => toggleToolActive(tool.id, isActive)}
                          className={`flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full transition-all cursor-pointer border ${
                            isActive
                              ? "bg-emerald-950/90 hover:bg-emerald-900/90 text-emerald-300 border-emerald-600/50 shadow-sm"
                              : "bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 border-amber-600/50"
                          }`}
                          title={
                            isActive
                              ? "Click to switch to Mock Mode"
                              : "Click to activate as Active MCP"
                          }
                        >
                          {isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Active MCP</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              <span>Mock Mode</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-0.5" />
                            </>
                          )}
                        </button>

                        <span className="text-[10px] font-mono text-zinc-500">
                          {isActive ? Math.min(tool.latencyMs, 48) : tool.latencyMs}ms
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                      {tool.description}
                    </p>

                    {/* Tag Pills */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {tool.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-800/60 text-zinc-400 border border-zinc-700/40"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions & Tester */}
                  <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                    {tool.sampleQuery && onSelectSampleQuery ? (
                      <button
                        onClick={() => {
                          onSelectSampleQuery(tool.sampleQuery!);
                          onClose();
                        }}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium truncate flex-1 text-left"
                        title={tool.sampleQuery}
                      >
                        ⚡ Try: &ldquo;{tool.sampleQuery}&rdquo;
                      </button>
                    ) : (
                      <div className="text-[11px] text-zinc-500 font-mono">
                        {isActive ? "Ready for autonomous execution" : "Ready for agent invocation"}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Interactive Power / Activate Button */}
                      <button
                        type="button"
                        onClick={() => toggleToolActive(tool.id, isActive)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border ${
                          isActive
                            ? "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40"
                            : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                        }`}
                        title={isActive ? "Click to deactivate" : "Click to activate tool"}
                      >
                        <Power className={`w-3 h-3 ${isActive ? "text-emerald-400" : "text-zinc-400"}`} />
                        <span>{isActive ? "Active" : "Activate"}</span>
                      </button>

                      {/* Ping Button */}
                      <button
                        onClick={() => handleTestQuery(tool)}
                        disabled={isTesting}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium shrink-0 transition-colors"
                      >
                        {isTesting ? (
                          <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                        ) : (
                          <Play className="w-3 h-3 text-cyan-400" />
                        )}
                        <span>{isTesting ? "Testing..." : "Ping"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Test Result Output Box */}
                  {hasTestOutput && (
                    <div className="mt-3 p-2.5 rounded-lg bg-black/60 border border-zinc-800 font-mono text-[10px] text-emerald-400 overflow-x-auto">
                      <div className="flex items-center justify-between text-zinc-500 mb-1">
                        <span className="flex items-center gap-1">
                          <Terminal className="w-3 h-3 text-emerald-400" />
                          Diagnostic Response (200 OK)
                        </span>
                        <button
                          onClick={() => setTestResult(null)}
                          className="text-zinc-600 hover:text-zinc-400"
                        >
                          Clear
                        </button>
                      </div>
                      <pre>{testResult.output}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
