"use client";

import { useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { WorkspaceProject } from "@/lib/state/session-store";

interface ProjectManagerProps {
  isOpen: boolean;
  projects: WorkspaceProject[];
  onClose: () => void;
  onProjectsChange: (projects: WorkspaceProject[]) => void;
}

export default function ProjectManager({ isOpen, projects, onClose, onProjectsChange }: ProjectManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const reset = () => {
    setEditingId(null);
    setName("");
    setInstructions("");
    setError("");
  };

  const startEdit = (project: WorkspaceProject) => {
    setEditingId(project.id);
    setName(project.name);
    setInstructions(project.instructions);
    setError("");
  };

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(editingId ? `/api/projects?id=${editingId}` : "/api/projects", {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), instructions }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Project save failed");
      const project = data.project as WorkspaceProject;
      onProjectsChange(editingId ? projects.map((item) => item.id === project.id ? project : item) : [project, ...projects]);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Project save failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Archive this project? Its chats remain recoverable.")) return;
    const response = await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
    if (response.ok) onProjectsChange(projects.filter((project) => project.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[min(720px,90vh)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl">
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div><h2 className="text-sm font-semibold text-zinc-100">Projects</h2><p className="mt-1 text-xs text-zinc-500">Project instructions are included in every chat context.</p></div>
          <button onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white" title="Close projects"><X className="h-4 w-4" /></button>
        </header>
        <div className="grid min-h-0 flex-1 gap-4 overflow-auto p-5 md:grid-cols-[1fr_1.1fr]">
          <div className="space-y-2">
            {projects.length === 0 && <p className="rounded-xl border border-dashed border-zinc-800 p-4 text-xs text-zinc-500">No projects yet.</p>}
            {projects.map((project) => (
              <div key={project.id} className="flex items-start justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                <div className="min-w-0"><p className="truncate text-sm font-medium text-zinc-100">{project.name}</p><p className="mt-1 line-clamp-2 text-xs text-zinc-500">{project.instructions || "No project instructions"}</p></div>
                <div className="flex shrink-0 gap-1"><button onClick={() => startEdit(project)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white" title="Edit project"><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => remove(project.id)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-950 hover:text-red-300" title="Archive project"><Trash2 className="h-3.5 w-3.5" /></button></div>
              </div>
            ))}
            <button onClick={reset} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 px-3 py-3 text-xs text-zinc-400 hover:border-cyan-500/50 hover:text-cyan-300"><Plus className="h-3.5 w-3.5" />New project</button>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">{editingId ? "Edit project" : "New project"}</p>
            <label className="block text-xs text-zinc-400">Name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-500" placeholder="Q4 Growth Strategy" /></label>
            <label className="mt-3 block text-xs text-zinc-400">Instructions<textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} className="mt-1 min-h-40 w-full resize-y rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-500" placeholder="Brand voice, audience, constraints, preferred outputs..." /></label>
            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            <div className="mt-4 flex justify-end gap-2"><button onClick={reset} className="rounded-lg px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800">Clear</button><button disabled={busy || !name.trim()} onClick={save} className="flex items-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-zinc-950 disabled:opacity-50"><Save className="h-3.5 w-3.5" />{busy ? "Saving..." : "Save project"}</button></div>
          </div>
        </div>
      </div>
    </div>
  );
}
