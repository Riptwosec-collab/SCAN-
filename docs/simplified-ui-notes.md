# Simplified OCR UI Notes

This branch adds a lightweight UI simplification layer on top of the merged Multi OCR + OQC work.

## Main page simplifications

- Theme selector is reduced to 3 modes:
  - Light
  - Dark
  - Pro Gold
- Main export buttons are simplified to:
  - Copy
  - TXT
  - DOCX
  - PDF
- Advanced exports are moved behind an `Advanced Export` drawer:
  - DOC
  - CSV
  - JSON
  - XLS
  - Markdown
  - Searchable PDF
- Technical review tools are moved behind a `เครื่องมือขั้นสูง` drawer:
  - Compare
  - Raw OCR
  - Go Low
  - Highlight
  - Review
- Preset selector is reduced to 4 user-friendly choices:
  - เอกสารทั่วไป
  - ใบเสร็จ / ใบกำกับภาษี
  - ภาพจากมือถือ
  - ตาราง / ฟอร์ม
- OCR Engine is forced to Auto on the main flow and remains inside Advanced.
- PDF compare is hidden from the primary Scan page.
- Auto-delete dropdown is hidden and replaced by the simpler `ไม่บันทึกประวัติ` toggle.

## Live dashboard changes

- Adds a real action bar above OCR Team Status.
- Adds `สแกนอัตโนมัติ`, `อัปโหลดไฟล์`, and `ทดสอบด้วยภาพตัวอย่าง` buttons.
- If no file is selected, the dashboard sends the user back to the Upload Zone instead of doing nothing.
- OCR result buttons are disabled until a real scan completes.
- The demo button creates a sample image and runs real Tesseract OCR through the Multi OCR + OQC pipeline.
- Service worker cache now includes `multi-ocr-live-ui` assets.

## OCR layout formatter

- Adds a formatted article view after OCR completes.
- Splits scanned text into step cards when it detects `ขั้นตอนที่ 1`, `ขั้นตอนที่ 2`, `Step 1`, or numbered headings.
- Renders big bold headings, readable paragraphs, and numbered badges similar to the reference image.
- Highlights command-like text such as `ipconfig /release`, `ipconfig /renew`, `ping`, `nslookup`, and quoted settings as rounded code pills.
- Keeps raw OCR text available for normal copy/export.

## Implementation

The simplification is implemented in `js/theme.js` as a post-load UI layer so existing OCR, export, and OQC features remain available without rewriting the full page. The actionable dashboard behavior lives in `js/multi-ocr-live-ui.js` with styles in `css/multi-ocr-live-ui.css`. The formatted article output lives in `js/ocr-layout-formatter.js` with styles in `css/ocr-layout-formatter.css`.
