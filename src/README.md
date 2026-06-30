# SCAN PRO AI Architecture Foundation

This repository currently ships as a static browser app. The production direction is a modular OCR / Document Intelligence platform. The runtime-compatible service layer lives in `js/scan-pro-platform.js` first so the current app keeps working without a build step.

Planned modular layout:

- `src/services/uploadService`
- `src/services/fileAnalyzerService`
- `src/services/imagePreprocessService`
- `src/services/pdfService`
- `src/services/ocrService`
- `src/services/textCleanupService`
- `src/services/exportService`
- `src/services/historyService`
- `src/services/settingsService`
- `src/types`
- `src/workers`

Migration rule: move one service at a time from the legacy browser globals into typed modules, then add a bundler only when the static app has stable parity.
