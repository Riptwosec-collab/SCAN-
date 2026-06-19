# RIPTWOSEC.SCAN — AI Review Pro Setup

ระบบนี้ทำให้เว็บ **RIPTWOSEC.SCAN** สามารถใช้ **AI Review หลัง OCR** ได้จริง โดยใช้ **OpenAI API Key ของเจ้าของเว็บ** ที่เก็บไว้ใน Backend และให้ผู้ใช้สนับสนุนเว็บผ่าน **Donate Mode** เพื่อรับ **Access Code**

---

## 1. API Call คืออะไร

**API Call** คือการที่หน้าเว็บส่งคำขอไปยังระบบหลังบ้าน เพื่อให้ระบบหลังบ้านประมวลผล แล้วส่งคำตอบกลับมา

```text
ผู้ใช้กดแปลง
↓
เว็บ OCR ได้ข้อความดิบ
↓
เว็บทำ Rule-based Cleanup
↓
เว็บส่ง Raw OCR + Draft ที่แก้แล้ว ไปที่ /api/ai-review
↓
Backend ตรวจ Access Code
↓
Backend ใช้ OpenAI API Key ของเจ้าของเว็บ
↓
OpenAI ช่วยตรวจและแก้ข้อความทั้งย่อหน้า
↓
Backend ส่งข้อความที่แก้แล้วกลับมา
↓
เว็บแสดง Output
```

---

## 2. ทำไมต้องมี Backend

ห้ามใส่ **OpenAI API Key ของเจ้าของเว็บ** ไว้ใน JavaScript หน้าเว็บโดยตรง เพราะผู้ใช้สามารถเปิด DevTools แล้วเห็น Key ได้

```text
Frontend
- ไม่มี OpenAI API Key

Backend
- เก็บ OpenAI API Key ไว้ใน Environment Variables

ผู้ใช้
- ต้องมี Access Code ก่อนถึงเรียก AI Review Pro ได้
```

---

## 3. โครงสร้างระบบ AI Review Pro

```text
RIPTWOSEC.SCAN Frontend
↓
/api/ai-review
↓
ตรวจ Access Code
↓
OpenAI Responses API
↓
ส่งข้อความที่แก้แล้วกลับไปหน้าเว็บ
```

---

## 4. Donate Mode คืออะไร

**Donate Mode** คือโหมดที่ผู้ใช้สนับสนุนเว็บก่อน แล้วเจ้าของเว็บส่ง Access Code ให้

```text
ผู้ใช้ Donate 49 บาท
↓
เจ้าของเว็บส่งโค้ด RIP100
↓
ผู้ใช้ใส่โค้ดใน AI Review Pro
↓
ใช้งาน AI Review ได้
```

---

## 5. Environment Variables ที่ต้องตั้งใน Vercel

```text
Vercel Dashboard
→ Project
→ Settings
→ Environment Variables
```

```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
PAID_ACCESS_CODES=RIP100,RIP300,RIPPRO
AI_REVIEW_MODEL=gpt-4o-mini
```

คำอธิบาย:

```text
OPENAI_API_KEY = API Key ของเจ้าของเว็บ
PAID_ACCESS_CODES = รายชื่อโค้ดที่อนุญาตให้ใช้ AI Review Pro
AI_REVIEW_MODEL = รุ่น AI ที่ใช้ตรวจ OCR
```

แนะนำใช้:

```env
AI_REVIEW_MODEL=gpt-4o-mini
```

---

## 6. ตัวอย่าง Access Code

```env
PAID_ACCESS_CODES=RIP49,RIP99,RIP199,RIPPRO
```

```text
RIP49  = สำหรับผู้ Donate 49 บาท
RIP99  = สำหรับผู้ Donate 99 บาท
RIP199 = สำหรับผู้ Donate 199 บาท
RIPPRO = สำหรับผู้สนับสนุนพิเศษ
```

หมายเหตุ: ระบบระยะเริ่มต้นนี้เป็นแบบ Manual Code คือเจ้าของเว็บเป็นคนแจกโค้ดเอง

---

## 7. วิธีใช้งานฝั่งผู้ใช้

1. เปิดเว็บ RIPTWOSEC.SCAN
2. ไปที่ Tool
3. เปิดเมนู **AI Review Pro หลัง OCR**
4. ติ๊ก **เปิด AI Review วิเคราะห์ทั้งย่อหน้า**
5. เลือกโหมด **Donate Mode: ใช้ Key เจ้าของเว็บ + Access Code**
6. ใส่ Access Code ที่ได้รับหลัง Donate
7. กด **บันทึก AI Review**
8. อัปโหลดรูปหรือ PDF
9. กด **แปลง**

---

## 8. API Endpoint

```text
POST /api/ai-review
```

ตัวอย่าง Request:

```json
{
  "accessCode": "RIP100",
  "rawText": "ข้อความ OCR ดิบ",
  "cleanedText": "ข้อความที่ Rule-based แก้แล้ว",
  "model": "gpt-4o-mini"
}
```

ตัวอย่าง Response:

```json
{
  "reviewedText": "ข้อความที่ AI แก้แล้ว",
  "model": "gpt-4o-mini"
}
```

---

## 9. ถ้า Access Code ผิด

```json
{
  "error": "ต้องซื้อ/ใส่ Access Code ก่อนใช้ AI Review Pro"
}
```

หน้าเว็บจะ fallback กลับไปใช้ Rule-based Cleanup เดิม

---

## 10. Prompt ที่ใช้กับ AI Review

ระบบส่ง Prompt ให้ AI ทำหน้าที่เป็น:

```text
AI Thai Document & OCR Post-Processor
```

หน้าที่คือ:

```text
- แก้ข้อความ OCR ภาษาไทย/อังกฤษ
- แก้สระและวรรณยุกต์ผิด
- รวมคำที่เว้นวรรคผิด
- ลบขยะ OCR
- รักษาเลขเอกสาร วันที่ เบอร์โทร Email URL และชื่อเฉพาะ
- ห้ามสรุป
- ห้ามแต่งข้อมูลใหม่
- ส่งกลับเฉพาะข้อความที่แก้แล้ว
```

---

## 11. ข้อดีของ AI Review Pro

```text
- แม่นกว่า Rule-based
- เข้าใจบริบททั้งย่อหน้า
- แก้คำเพี้ยนใหม่ ๆ ได้ดีกว่า
- เหมาะกับเอกสารไทยที่ OCR มั่วหนัก
- ใช้กับเอกสาร IT, Email, Ticket, PDF, หนังสือบริษัท, ใบเสร็จ, ใบกำกับภาษีได้
```

---

## 12. ข้อจำกัด

AI Review Pro จะทำงานได้เมื่อมีครบ 3 อย่าง:

```text
1. OPENAI_API_KEY ตั้งใน Vercel แล้ว
2. PAID_ACCESS_CODES มีโค้ดที่ผู้ใช้ใส่
3. ผู้ใช้เปิด AI Review Pro และใส่ Access Code ถูกต้อง
```

ถ้าขาดอย่างใดอย่างหนึ่ง ระบบจะใช้ Rule-based เดิมแทน

---

## 13. สิ่งที่ควรทำต่อในอนาคต

```text
- ระบบ Login
- ระบบ Credit ต่อผู้ใช้
- 1 เครดิต = 1 หน้า AI Review
- Database เก็บ usage
- ระบบ PromptPay / Payment Gateway
- Dashboard เจ้าของเว็บดูยอดใช้งาน
- จำกัดจำนวนหน้าต่อ Access Code
- ป้องกันการใช้โค้ดร่วมกันหลายคน
```

---

## 14. สรุป

**RIPTWOSEC.SCAN AI Review Pro** คือระบบ OCR ที่ใช้ AI จริงหลังจาก OCR เสร็จแล้ว โดยให้ผู้ใช้สนับสนุนเว็บผ่าน Donate และใช้ Access Code เพื่อเปิด AI Review

```text
Free Mode
OCR + Rule-based Cleanup

Donate Mode
OCR + Rule-based Cleanup + AI Review Pro

BYOK Mode
ผู้ใช้ใช้ OpenAI API Key ของตัวเอง
```
