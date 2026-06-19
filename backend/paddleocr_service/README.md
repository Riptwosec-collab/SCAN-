# RIPTWOSEC.SCAN PaddleOCR Local Backend

Optional local OCR backend for higher-accuracy image/PDF-scan reading. The existing browser OCR still works without this service.

## Install on Windows CPU

```powershell
cd "C:\Users\ASUS ROG\Documents\Scan\backend\paddleocr_service"
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install paddlepaddle==3.2.0 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/
python -m pip install -r requirements.txt
```

## Run

```powershell
.\start-paddleocr.ps1
```

The service runs at:

```text
http://127.0.0.1:8765
```

In the web app, open **ตัวเลือกขั้นสูง**, set:

```text
Engine: PaddleOCR Local
PaddleOCR endpoint: http://127.0.0.1:8765
```

Then click **Test Paddle**.

## Endpoints

- `GET /health`
- `POST /ocr/image`

`POST /ocr/image` accepts multipart form data:

- `file`: image file
- `lang`: `th` or `en`
- `profile`: `image` or `pdf`
- `page_number`: optional page number

It returns:

- `text`
- `confidence_score`
- `lines[]`
- `bounding_box`
- `page_number`
- `line_number`
- `detected_language`
- `low_confidence_words`
- `layout_blocks`
