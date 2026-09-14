"use client";

import { useState, useEffect, useRef } from "react";
import { BUILTIN_SKILLS } from "@/lib/skills/catalog";
import {
  Megaphone,
  Sparkles,
  Search,
  Target,
  Mail,
  Zap,
  Command,
} from "lucide-react";

interface SkillsMenuPopoverProps {
  isOpen: boolean;
  filterText: string;
  onSelectSkill: (slug: string) => void;
  onClose: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Megaphone,
  Sparkles,
  Search,
  Target,
  Mail,
  Zap,
};

export default function SkillsMenuPopover({
  isOpen,
  filterText,
  onSelectSkill,
  onClose,
}: SkillsMenuPopoverProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const cleanFilter = filterText.replace(/^\//, "").toLowerCase().trim();

  const filteredSkills = BUILTIN_SKILLS.filter(
    (s) =>
      s.slug.toLowerCase().includes(cleanFilter) ||
      s.name.toLowerCase().includes(cleanFilter) ||
      s.description.toLowerCase().includes(cleanFilter)
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => setSelectedIndex(0));
    return () => cancelAnimationFrame(frame);
  }, [filterText]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen || filteredSkills.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredSkills.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredSkills.length) % filteredSkills.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const chosen = filteredSkills[selectedIndex];
        if (chosen) {
          onSelectSkill(chosen.slug);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredSkills, selectedIndex, onSelectSkill, onClose]);

  if (!isOpen || filteredSkills.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 mb-2 w-80 sm:w-96 rounded-xl border p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-y-auto"
      style={{
        borderColor: "var(--color-border)",
        background: "#09090b",
      }}
    >
      <div className="flex items-center justify-between px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-800/60 mb-1">
        <span className="flex items-center gap-1.5">
          <Command className="w-3 h-3 text-cyan-400" />
          Marketing Skills & Frameworks
        </span>
        <span>Use ↑↓ to navigate</span>
      </div>

      <div className="space-y-1">
        {filteredSkills.map((skill, idx) => {
          const Icon = ICON_MAP[skill.icon] || Sparkles;
          const isSelected = selectedIndex === idx;

          return (
            <button
              key={skill.slug}
              onClick={() => onSelectSkill(skill.slug)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-all ${
                isSelected
                  ? "bg-cyan-500/10 border border-cyan-500/30 text-zinc-100"
                  : "border border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <div
                className={`p-1.5 rounded-md shrink-0 mt-0.5 ${
                  isSelected ? "bg-cyan-500/20 text-cyan-400" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-zinc-100">{skill.name}</span>
                  <span className="text-[10px] font-mono font-medium text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                    {skill.slug}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5 leading-relaxed">
                  {skill.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
