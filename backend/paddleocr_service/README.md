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
- `POST /ocr/zone`
- `POST /ocr/rescan`
- `POST /ocr/pdf`

`POST /ocr/image` accepts multipart form data:

- `file`: image file
- `lang`: `th` or `en`
- `profile`: `image` or `pdf`
- `page_number`: optional page number

`POST /ocr/zone` accepts the same image fields plus:

- `x`, `y`, `width`, `height`: crop area
- `unit`: `pixel` or `percent`

`POST /ocr/rescan` is an image scan endpoint for retry flows.

`POST /ocr/pdf` accepts multipart form data:

- `file`: PDF file
- `lang`: `th` or `en`
- `profile`: normally `pdf`
- `pages`: `all`, `1-5`, or `1-3,7,10`
- `strategy`: `auto`, `text-first`, or `ocr`
- `skip_blank`: `true` or `false`
- `dpi`: render DPI for scanned pages, recommended `220` to `300`

PDF processing is page-aware:

- pages with a usable text layer are extracted directly for speed and accuracy
- scanned pages are rendered to images and sent through PaddleOCR
- mixed PDFs can use text extraction on some pages and OCR on others
- the response includes per-page text, confidence, method, low-confidence words, and layout blocks

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
- `pages[]` for PDF workflows
