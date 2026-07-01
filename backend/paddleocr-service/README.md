# RIPTWOSEC.SCAN PaddleOCR Local Service

Optional local OCR engine สำหรับ RIPTWOSEC.SCAN ใช้เมื่ออยากอ่านไทย/อังกฤษด้วย PaddleOCR ในเครื่องตัวเอง แล้วให้หน้าเว็บเรียกผ่าน endpoint ภายในเครื่อง

## Endpoint

ค่าเริ่มต้นในเว็บ:

```text
http://127.0.0.1:8765
```

API ที่มี:

```text
GET  /health
POST /ocr/image
```

`POST /ocr/image` รับ `multipart/form-data`:

```text
file    = รูป PNG/JPG ที่ส่งจาก canvas
lang    = th หรือ en
profile = image หรือ pdf
source  = browser-canvas
```

Response ตัวอย่าง:

```json
{
  "text": "ข้อความที่อ่านได้",
  "confidence_score": 92.5,
  "lines": [
    {
      "text": "ตัวอย่างข้อความ",
      "confidence": 95.2,
      "bounding_box": [[10,10],[200,10],[200,40],[10,40]],
      "page_number": 1,
      "line_number": 1
    }
  ],
  "low_confidence_words": [],
  "layout_blocks": []
}
```

## วิธีรันบน Windows

เปิด PowerShell ที่โฟลเดอร์นี้ แล้วรัน:

```powershell
./start-paddleocr.ps1
```

หรือรันเอง:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8765 --reload
```

## วิธีใช้ในเว็บ

1. เปิด backend ให้ทำงานก่อน
2. เปิดเว็บ RIPTWOSEC.SCAN
3. ไปที่ตัวเลือกขั้นสูง
4. เลือก `Engine: PaddleOCR Local`
5. Endpoint ใช้ `http://127.0.0.1:8765`
6. กด `Test Paddle`
7. กดแปลง

ถ้า backend ไม่ได้เปิด เว็บยังใช้ Engine Auto / Tesseract ได้เหมือนเดิม

## หมายเหตุ

- PaddleOCR Local ใช้ทรัพยากรเครื่องค่อนข้างเยอะตอนโหลดครั้งแรก
- ถ้าติดตั้ง `paddlepaddle` ไม่ผ่าน ให้ดู Python version และลองใช้ Python 3.10 หรือ 3.11
- ถ้าใช้ GPU ให้ตั้ง environment variable `PADDLE_USE_GPU=true`
