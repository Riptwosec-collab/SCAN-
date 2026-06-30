# Core Types

```ts
type ProcessingState =
  | "idle"
  | "analyzing"
  | "preprocessing"
  | "rendering_pdf"
  | "recognizing"
  | "cleaning"
  | "exporting"
  | "done"
  | "error"
  | "cancelled";

interface FileAnalysis {
  id: string;
  name: string;
  type: "image" | "pdf" | "unknown";
  mime: string;
  size: number;
  supported: boolean;
  warnings: string[];
  pageCount: number;
  likelyKind: string;
}

interface OcrHistoryRecord {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
  pageCount: number;
  language: string;
  mode: string;
  rawText: string;
  cleanedText: string;
  settings: Record<string, unknown>;
}
```
