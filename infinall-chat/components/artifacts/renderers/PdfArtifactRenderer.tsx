"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

interface PdfArtifactRendererProps { title: string; content: string; }

export default function PdfArtifactRenderer({ title, content }: PdfArtifactRendererProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let objectUrl: string | null = null;
    const load = async () => {
      try {
        const response = await fetch("/api/artifacts/export/pdf", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title, content }),
        });
        if (!response.ok) throw new Error((await response.json()).error || "PDF preview failed");
        objectUrl = URL.createObjectURL(await response.blob());
        setUrl(objectUrl);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "PDF preview failed");
      }
    };
    void load();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [content, title]);

  if (error) return <div className="flex h-full items-center justify-center gap-2 p-6 text-xs text-amber-300"><AlertTriangle className="h-4 w-4" />{error}</div>;
  if (!url) return <div className="flex h-full items-center justify-center gap-2 text-xs text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />Rendering PDF...</div>;
  return <iframe title={title} src={url} className="h-full w-full border-0 bg-white" />;
}
