# Multimodal Input Pipeline Architecture (Vision & Video Understanding)

## Overview
Implement native multimodal understanding for images and video in Infinall Chat as a first-class input pipeline.
Instead of treating images/videos as plain text or pre-embedding them blindly for RAG, the architecture uses a **Dual-Path Pipeline**:
1. **Immediate Multimodal Q&A Path**: Direct visual and video comprehension (OCR, scene understanding, UI analysis, timestamps).
2. **Searchable Knowledge Path**: Extracted insights, transcripts, and structured findings indexed into Postgres/pgvector RAG.

---

## User Review Required

> [!IMPORTANT]
> - **Block-based Messages**: Chat messages become block-based (`text`, `image`, `video`, `document`) allowing multi-asset questions in a single prompt.
> - **Interactive Video Timestamp Citations**: Citations like `[01:42]` in the AI's response will be clickable and will immediately seek the embedded video player to that exact second.
> - **Multimodal Gateway Interface**: Abstracts vision and video analysis with structured output (`VisualAnalysis` & `VideoAnalysis`).

---

## Proposed Changes

### Component 1: Multimodal Gateway & Analysis Engine

#### [NEW] `lib/multimodal/gateway.ts`
- Implements `MultimodalGateway` interface:
  - `analyzeImage(input: ImageInput): Promise<VisualAnalysis>`
  - `analyzeVideo(input: VideoInput): Promise<VideoAnalysis>`
  - `transcribeAudio(input: AudioInput): Promise<Transcript>`
- Supports structured visual output:
  - `VisualAnalysis`: summary, ocrText, detected objects, focal points, direct answers to user queries.
  - `VideoAnalysis`: summary, transcript segments, key scenes, and timestamp citations `[mm:ss]`.

#### [NEW] `lib/multimodal/video.ts`
- Video analysis engine:
  - Extracts metadata (duration, format, resolution).
  - Processes audio/speech transcription with exact start/end timestamps.
  - Dissects scenes and detects visual transitions and marketing hooks.
  - Generates timestamped findings (e.g. `01:42 - Product Pricing Table Introduced`, `03:17 - Call-To-Action Button`).

#### [MODIFY] `lib/multimodal/types.ts`
- Define canonical `ContentBlock` union:
  ```ts
  export type ContentBlock =
    | { type: 'text'; text: string }
    | { type: 'image'; mediaId: string; mimeType: string; url: string; base64Data?: string }
    | { type: 'video'; mediaId: string; mimeType: string; url: string }
    | { type: 'document'; mediaId: string; mimeType: string; url: string };
  ```
- Define `VisualAnalysis`, `VideoAnalysis`, `TimestampCitation`, `VideoScene`.

---

### Component 2: Frontend Multimodal & Timestamp Seeking

#### [MODIFY] `components/chat/AssistantMessage.tsx`
- Enhance markdown renderer to detect timestamp citations `[mm:ss]` or `[hh:mm:ss]`.
- Convert timestamp citations into interactive badges (`[▶ 01:42]`).
- Clicking the badge emits a custom event `seek-video-player` with `{ timestampSeconds }` to control the active video player.

#### [NEW] `components/multimodal/InlineVideoPlayer.tsx`
- Interactive video player with:
  - Native playback controls.
  - Scene timeline markers.
  - Event listener for `seek-video-player` events to jump immediately to clicked citations.

#### [MODIFY] `components/workspace/SplitWorkspace.tsx`
- Render `InlineVideoPlayer` in the workspace when a video is attached or being discussed.
- Pass block-based message payloads to `/api/chat`.

---

### Component 3: Agent Loop, Planner & RAG Integration

#### [MODIFY] `app/api/chat/route.ts` & `lib/state/planner.ts`
- Router recognizes image and video modalities in user blocks.
- Injects multimodal analysis results into the model context.
- Dual-path execution: streams the direct visual/video answer immediately, and enqueues background indexing into the knowledge base.

---

## Verification Plan

### Automated Tests
- `npx tsx tests/test-multimodal-gateway.ts`: Test image and video analysis pipeline with sample assets and verify timestamp citations.
- `npx tsc --noEmit`: Ensure zero TypeScript errors across all modified files.

### Manual Verification
- Upload an image in the UI, ask a specific visual question ("What are the key elements in this screenshot?"), verify direct visual answer.
- Upload a video file, ask a question ("What is the CTA and at what timestamp does it appear?"), verify the AI responds with `[01:42]` style timestamp citations and clicking them seeks the video.
