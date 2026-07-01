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

## Implementation

The simplification is implemented in `js/theme.js` as a post-load UI layer so existing OCR, export, and OQC features remain available without rewriting the full page.
