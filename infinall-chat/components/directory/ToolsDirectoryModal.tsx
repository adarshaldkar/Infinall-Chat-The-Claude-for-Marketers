"use client";

import { useState, useEffect } from "react";
import { ToolCategory, ToolDirectoryItem } from "@/lib/tools/directory-catalog";
import {
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Megaphone,
  BarChart2,
  Search as SearchIcon,
  Users,
  Zap,
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
  const [tools, setTools] = useState<ToolDirectoryItem[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const params = new URLSearchParams();
    if (activeCategory !== "all") params.set("category", activeCategory);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());

    fetch(`/api/directory/tools?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Unable to load connector status");
        return res.json() as Promise<{ tools: ToolDirectoryItem[] }>;
      })
      .then((data) => setTools(data.tools ?? []))
      .catch(() => setTools([]));
  }, [activeCategory, isOpen, searchQuery]);

  if (!isOpen) return null;

  const totalActiveCount = tools.filter((tool) => tool.status === "active").length;

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
                  {tools.filter((tool) => tool.status !== "active").length} Not Connected
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Status is reported by the server from connector configuration and health state.
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
            {tools.map((tool) => {
              const isActive = tool.status === "active";

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
                        <span
                          className={`flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                            isActive
                              ? "bg-emerald-950/90 hover:bg-emerald-900/90 text-emerald-300 border-emerald-600/50 shadow-sm"
                              : tool.status === "mock"
                              ? "bg-amber-950/80 text-amber-300 border-amber-600/50"
                              : "bg-zinc-900 text-zinc-400 border-zinc-700"
                          }`}
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
                              <span>{tool.status === "mock" ? "Sandbox" : "Requires Auth"}</span>
                            </>
                          )}
                        </span>

                        <span className="text-[10px] font-mono text-zinc-500">
                          {tool.latencyMs}ms
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
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {isActive ? "Server connected" : "Configure in Tools settings"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
