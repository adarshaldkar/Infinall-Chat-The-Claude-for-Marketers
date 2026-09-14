"use client";

import { ArtifactType } from "@/lib/artifacts/types";
import HtmlAppRenderer from "./renderers/HtmlAppRenderer";
import MarkdownDocumentEditor from "./renderers/MarkdownDocumentEditor";
import ChartRenderer from "./renderers/ChartRenderer";
import MermaidDiagramRenderer from "./renderers/MermaidDiagramRenderer";
import SpreadsheetViewer from "./renderers/SpreadsheetViewer";
import CodeEditorRenderer from "./renderers/CodeEditorRenderer";
import SvgViewer from "./renderers/SvgViewer";
import VideoPlayerRenderer from "./renderers/VideoPlayerRenderer";
import PresentationViewer from "./renderers/PresentationViewer";

interface ArtifactRendererRegistryProps {
  id: string;
  type: ArtifactType | string;
  language?: string;
  content: string;
  viewMode: "preview" | "code";
  isStreaming?: boolean;
  onContentChange?: (newContent: string) => void;
}

export default function ArtifactRendererRegistry({
  type,
  language,
  content,
  viewMode,
  isStreaming,
  onContentChange,
}: ArtifactRendererRegistryProps) {
  // If user selected "Code" view mode, always render the Code Editor
  if (viewMode === "code") {
    return <CodeEditorRenderer content={content} language={language || (type as string)} />;
  }

  const normalizedType = (type || "html").toLowerCase() as ArtifactType;

  switch (normalizedType) {
    case "html":
    case "react":
      return <HtmlAppRenderer content={content} isStreaming={isStreaming} />;

    case "svg":
      return <SvgViewer content={content} isStreaming={isStreaming} />;

    case "video":
      return <VideoPlayerRenderer content={content} isStreaming={isStreaming} />;

    case "markdown":
    case "docx":
    case "pdf":
      return (
        <MarkdownDocumentEditor
          content={content}
          isStreaming={isStreaming}
          onContentChange={onContentChange}
        />
      );

    case "pptx":
      return <PresentationViewer content={content} isStreaming={isStreaming} />;

    case "xlsx":
      return <SpreadsheetViewer content={content} />;

    case "chart":
      return <ChartRenderer content={content} />;

    case "mermaid":
      return <MermaidDiagramRenderer content={content} />;

    case "code":
    default:
      return <CodeEditorRenderer content={content} language={language || "markdown"} />;
  }
}
