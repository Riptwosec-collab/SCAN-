# RIPTWOSEC.SCAN

RIPTWOSEC.SCAN คือเว็บ OCR แบบ Static Website สำหรับแปลงข้อความจากรูปภาพและ PDF พร้อมตัวช่วยแก้ปัญหา OCR ภาษาไทย เช่น ช่องว่างกลางคำ สระหาย และอักษรแปลกจากการสแกน

## Features

- OCR รูปภาพด้วย Tesseract.js
- อ่าน PDF Text Layer ด้วย pdf.js
- ถ้า PDF ไม่มี Text Layer จะ OCR จากภาพหน้า PDF แทน
- แก้คำไทยที่ OCR เว้นวรรคผิด เช่น `เครื อง` เป็น `เครื่อง`
- ลบอักษรแปลก เช่น `Ɵ`, `É`, `Ê`, `○`
- Export ผลลัพธ์เป็น TXT, DOC, CSV และไฟล์ HTML สำหรับ Print เป็น PDF
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
   ├─ text-cleaner.js
   ├─ ocr.js
   ├─ pdf-handler.js
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
| `js/text-cleaner.js` | แก้ OCR noise, ช่องว่างภาษาไทย, format ข้อความ |
| `js/ocr.js` | OCR รูปภาพด้วย Tesseract.js |
| `js/pdf-handler.js` | โหลด PDF, อ่าน Text Layer, OCR fallback |
| `js/exporter.js` | Copy และ Export TXT/DOC/CSV/PDF |
| `js/history.js` | จัดการประวัติ OCR ใน localStorage |
| `js/app.js` | ควบคุม event หลักของหน้าเว็บ |

## How to Use

1. เปิด `index.html` ผ่าน Browser
2. เลือกแท็บ `รูปภาพ` หรือ `PDF`
3. อัปโหลดไฟล์
4. เลือกภาษา OCR เช่น `ไทย + อังกฤษ`
5. กด `แปลง`
6. Copy หรือ Export ผลลัพธ์

## Recommended Settings for Thai OCR

เปิดตัวเลือกเหล่านี้ไว้:

- ลบอักษรแปลก
- รวมคำไทยที่ OCR เว้นวรรคผิด
- ขยายภาพก่อน OCR
- ขาวดำ/เพิ่ม Contrast
- ภาษา: ไทย + อังกฤษ

## Notes

- ต้องใช้อินเทอร์เน็ตเพื่อโหลด `pdf.js`, `tesseract.js` และ Google Fonts จาก CDN
- ไม่มีการส่งข้อมูลไป Backend ของโปรเจกต์นี้ แต่ Tesseract.js/pdf.js ถูกโหลดจาก CDN
- ถ้าเปิดผ่าน `file://` แล้วบาง Browser บล็อกบางฟังก์ชัน แนะนำเปิดผ่าน GitHub Pages, Vercel หรือ local server

## Local Server Example

ใช้ Python เปิด local server:

```bash
python -m http.server 8080
```

แล้วเปิด:

```text
http://localhost:8080
```

## Roadmap

- เพิ่ม dictionary แก้คำไทยเฉพาะสายงาน IT/NOC
- เพิ่ม Preview PDF หลายหน้า
- เพิ่ม Crop เฉพาะพื้นที่ OCR
- เพิ่ม Export PDF โดยตรงแบบไม่ต้อง Print
- เพิ่ม OCR engine option อื่นในอนาคต
