# RIPTWOSEC.SCAN

RIPTWOSEC.SCAN คือเว็บ OCR แบบ Static Website สำหรับแปลงข้อความจากรูปภาพและ PDF พร้อมระบบช่วยแก้ปัญหา OCR ภาษาไทย เช่น ช่องว่างกลางคำ สระหาย และอักษรแปลกจากการสแกน

## Features 1-13

1. Crop เลือกเฉพาะพื้นที่ OCR จากรูปภาพ
2. Preview ภาพหลัง Preprocess แบบ Original / Processed
3. Dictionary แก้คำเฉพาะสาย IT / NOC
4. เพิ่มคำแก้เองผ่านหน้าเว็บและเก็บใน localStorage
5. OCR Confidence Score
6. Side-by-side Compare ระหว่าง Source Preview และ Extracted Text
7. Highlight / Report คำที่ถูกแก้
8. Export เป็น JSON พร้อม rawText, cleanedText, fixedWords, pdfPages, batchResults
9. Batch OCR หลายไฟล์ ทั้งรูปภาพและ PDF
10. Search ในผลลัพธ์ OCR พร้อม Highlight
11. PDF Page Thumbnail สำหรับเลือกหน้า
12. Auto OCR เฉพาะหน้าที่ไม่มี Text Layer
13. Export แยกตามหน้า PDF เมื่อเปิดโหมดแยกผลลัพธ์ตามหน้า

## Core Features

- OCR รูปภาพด้วย Tesseract.js
- อ่าน PDF Text Layer ด้วย pdf.js
- ถ้า PDF ไม่มี Text Layer จะ OCR จากภาพหน้า PDF แทน
- แก้คำไทยที่ OCR เว้นวรรคผิด เช่น `เครื อง` เป็น `เครื่อง`
- ลบอักษรแปลก เช่น `Ɵ`, `É`, `Ê`, `○`
- Export ผลลัพธ์เป็น TXT, DOC, CSV, JSON และไฟล์ HTML สำหรับ Print เป็น PDF
- Copy ผลลัพธ์
- History เก็บใน Browser ด้วย localStorage
- ใช้งานได้โดยไม่ต้องมี Backend

## Project Structure

```text
SCAN-/
├─ index.html
├─ README.md
├─ css/
│  └─ style.css
└─ js/
   ├─ state.js
   ├─ utils.js
   ├─ dictionary-it.js
   ├─ custom-rules.js
   ├─ text-cleaner.js
   ├─ crop.js
   ├─ ocr.js
   ├─ pdf-handler.js
   ├─ batch.js
   ├─ search.js
   ├─ exporter.js
   ├─ history.js
   └─ app.js
```

## File Responsibilities

| File | Description |
|---|---|
| `index.html` | โครงหน้าเว็บและโหลดไฟล์ CSS/JS |
| `css/style.css` | ดีไซน์ UI ทั้งหมด |
| `js/state.js` | เก็บ state กลางของแอป |
| `js/utils.js` | Helper เช่น status, progress, download, output |
| `js/dictionary-it.js` | Dictionary แก้คำเฉพาะสาย IT/NOC |
| `js/custom-rules.js` | เพิ่ม/ลบคำแก้เองผ่าน localStorage |
| `js/text-cleaner.js` | แก้ OCR noise, ช่องว่างภาษาไทย, format ข้อความ, confidence |
| `js/crop.js` | Crop เลือกพื้นที่ OCR |
| `js/ocr.js` | OCR รูปภาพด้วย Tesseract.js และ Processed Preview |
| `js/pdf-handler.js` | โหลด PDF, อ่าน Text Layer, OCR fallback, thumbnail/page selection |
| `js/batch.js` | Batch OCR หลายไฟล์ |
| `js/search.js` | Search และ highlight ใน output |
| `js/exporter.js` | Copy และ Export TXT/DOC/CSV/JSON/PDF |
| `js/history.js` | จัดการประวัติ OCR ใน localStorage |
| `js/app.js` | ควบคุม event หลักของหน้าเว็บ |

## How to Use

1. เปิด `index.html` ผ่าน Browser หรือเปิดผ่าน GitHub Pages/Vercel/local server
2. เลือกแท็บ `รูปภาพ`, `PDF`, หรือ `Batch`
3. อัปโหลดไฟล์
4. เลือกภาษา OCR เช่น `ไทย + อังกฤษ`
5. เปิดตัวเลือก Clean ที่ต้องการ
6. กด `แปลง`
7. Copy หรือ Export ผลลัพธ์

## Recommended Settings for Thai OCR

เปิดตัวเลือกเหล่านี้ไว้:

- ลบอักษรแปลก
- รวมคำไทยที่ OCR เว้นวรรคผิด
- Dictionary IT/NOC
- ขยายภาพก่อน OCR
- ขาวดำ/เพิ่ม Contrast
- ภาษา: ไทย + อังกฤษ

## Notes

- ต้องใช้อินเทอร์เน็ตเพื่อโหลด `pdf.js`, `tesseract.js` และ Google Fonts จาก CDN
- ไม่มีการส่งข้อมูลไป Backend ของโปรเจกต์นี้ แต่ Tesseract.js/pdf.js ถูกโหลดจาก CDN
- ถ้าเปิดผ่าน `file://` แล้วบาง Browser บล็อกบางฟังก์ชัน แนะนำเปิดผ่าน GitHub Pages, Vercel หรือ local server

## Local Server Example

```bash
python -m http.server 8080
```

แล้วเปิด:

```text
http://localhost:8080
```

## Roadmap

- เพิ่ม Export ZIP สำหรับ Batch Results
- เพิ่ม OCR engine option อื่น
- เพิ่ม AI Summary / Incident Report ในอนาคต
- เพิ่ม Dictionary ภาษาไทยแบบใหญ่ขึ้น
