import io
import os
from typing import Any, Dict, List

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps

try:
    from paddleocr import PaddleOCR
except Exception:
    PaddleOCR = None

app = FastAPI(title='RIPTWOSEC.SCAN PaddleOCR Local Service')
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])

OCR_CACHE: Dict[str, Any] = {}
LOW_CONF = float(os.getenv('LOW_CONFIDENCE_THRESHOLD', '0.72'))


def lang_code(value: str) -> str:
    value = (value or 'th').lower().strip()
    if value in ['eng', 'en']:
        return 'en'
    return 'th'


def get_engine(lang: str):
    if PaddleOCR is None:
        raise RuntimeError('PaddleOCR is not installed. Run pip install -r requirements.txt')
    code = lang_code(lang)
    if code not in OCR_CACHE:
        OCR_CACHE[code] = PaddleOCR(use_angle_cls=True, lang=code, show_log=False, use_gpu=os.getenv('PADDLE_USE_GPU', 'false').lower() == 'true')
    return OCR_CACHE[code]


def image_to_array(image: Image.Image) -> np.ndarray:
    img = ImageOps.exif_transpose(image).convert('RGB')
    max_side = int(os.getenv('MAX_IMAGE_SIDE', '2800'))
    if max(img.size) > max_side:
        scale = max_side / max(img.size)
        img = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.LANCZOS)
    return np.array(img)


def box_points(raw_box):
    if not raw_box:
        return None
    try:
        return [[float(p[0]), float(p[1])] for p in raw_box]
    except Exception:
        return None


def block_type(text: str, box, width: int, height: int) -> str:
    if box:
        ys = [p[1] for p in box]
        if ys and min(ys) < height * 0.13:
            return 'header'
        if ys and max(ys) > height * 0.88:
            return 'footer'
    if ':' in text and len(text) <= 90:
        return 'key_value'
    if text.count('|') >= 2 or text.count('\t') >= 2:
        return 'table_row'
    return 'text'


def normalize_result(result, width: int, height: int) -> Dict[str, Any]:
    lines: List[Dict[str, Any]] = []
    low_words: List[Dict[str, Any]] = []
    blocks: List[Dict[str, Any]] = []
    items = result[0] if result and isinstance(result, list) and result and isinstance(result[0], list) else result
    for idx, item in enumerate(items or [], start=1):
        try:
            box = box_points(item[0])
            text = str(item[1][0]).strip()
            score = float(item[1][1])
        except Exception:
            continue
        if not text:
            continue
        conf = round(max(0, min(1, score)) * 100, 2)
        line = {'text': text, 'confidence': conf, 'score': round(score, 4), 'bounding_box': box, 'page_number': 1, 'line_number': idx}
        lines.append(line)
        if score < LOW_CONF:
            low_words.append({'text': text, 'confidence': conf, 'bounding_box': box, 'line_number': idx})
        blocks.append({'type': block_type(text, box, width, height), 'text': text, 'confidence': conf, 'bounding_box': box})
    text = '\n'.join(x['text'] for x in lines).strip()
    avg = round(sum(x['confidence'] for x in lines) / len(lines), 2) if lines else 0
    return {'text': text, 'confidence_score': avg, 'lines': lines, 'low_confidence_words': low_words, 'layout_blocks': blocks, 'line_count': len(lines)}


@app.get('/health')
def health():
    return {'ok': True, 'ready': PaddleOCR is not None, 'engine': 'PaddleOCR Local', 'loaded_languages': list(OCR_CACHE.keys())}


@app.post('/ocr/image')
async def ocr_image(file: UploadFile = File(...), lang: str = Form('th'), profile: str = Form('image'), source: str = Form('browser-canvas')):
    try:
        img = Image.open(io.BytesIO(await file.read()))
        arr = image_to_array(img)
        result = get_engine(lang).ocr(arr, cls=True)
        payload = normalize_result(result, int(arr.shape[1]), int(arr.shape[0]))
        payload.update({'engine': 'PaddleOCR Local', 'detected_language': lang_code(lang), 'profile': profile, 'source': source, 'image': {'width': int(arr.shape[1]), 'height': int(arr.shape[0])}})
        return payload
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('main:app', host='127.0.0.1', port=8765, reload=True)
