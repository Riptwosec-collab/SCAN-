from __future__ import annotations

import os
import json
import tempfile
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps


APP_NAME = "RIPTWOSEC.SCAN PaddleOCR Service"
DEFAULT_LANG = os.getenv("PADDLEOCR_LANG", "th")
USE_GPU = os.getenv("PADDLEOCR_USE_GPU", "false").lower() in {"1", "true", "yes"}


app = FastAPI(title=APP_NAME, version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("PADDLEOCR_CORS_ORIGINS", "*").split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def normalize_lang(lang: str | None) -> str:
    value = (lang or DEFAULT_LANG or "th").lower()
    if value in {"tha", "thai", "th", "tha+eng", "th+en"}:
        return "th"
    if value in {"eng", "english", "en"}:
        return "en"
    return value


@lru_cache(maxsize=6)
def get_engine(lang: str):
    try:
        from paddleocr import PaddleOCR
    except Exception as exc:  # pragma: no cover - dependency is optional locally
        raise RuntimeError(
            "PaddleOCR is not installed. Run the backend setup commands in backend/paddleocr_service/README.md"
        ) from exc

    kwargs: dict[str, Any] = {"lang": lang}
    try:
        return PaddleOCR(use_textline_orientation=True, **kwargs)
    except TypeError:
        kwargs.update({"use_angle_cls": True, "show_log": False, "use_gpu": USE_GPU})
        return PaddleOCR(**kwargs)


def prepare_image(upload: UploadFile) -> Path:
    suffix = Path(upload.filename or "scan.png").suffix or ".png"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp:
        temp.write(upload.file.read())
        temp_path = Path(temp.name)

    try:
        image = Image.open(temp_path)
        image = ImageOps.exif_transpose(image).convert("RGB")
        image = ImageOps.autocontrast(image)
        image.save(temp_path)
    except Exception as exc:
        temp_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"Invalid image file: {exc}") from exc

    return temp_path


def to_plain_box(box: Any) -> list[list[float]] | None:
    if box is None:
        return None
    try:
        if hasattr(box, "tolist"):
            box = box.tolist()
        return [[float(point[0]), float(point[1])] for point in box]
    except Exception:
        return None


def result_payload(result: Any) -> Any:
    if hasattr(result, "json") and callable(result.json):
        try:
            value = result.json()
            return json.loads(value) if isinstance(value, str) else value
        except Exception:
            pass
    if hasattr(result, "json") and not callable(result.json):
        try:
            value = result.json
            return json.loads(value) if isinstance(value, str) else value
        except Exception:
            pass
    if hasattr(result, "res"):
        return result.res
    if isinstance(result, dict) and "res" in result:
        return result["res"]
    return result


def parse_modern_result(raw: Any, page_number: int) -> list[dict[str, Any]]:
    payload = result_payload(raw)
    if not isinstance(payload, dict):
        return []
    texts = payload.get("rec_texts") or payload.get("texts") or []
    scores = payload.get("rec_scores") or payload.get("scores") or []
    boxes = payload.get("rec_polys") or payload.get("dt_polys") or payload.get("boxes") or []
    lines = []
    for index, text in enumerate(texts):
        value = str(text or "").strip()
        if not value:
            continue
        score = float(scores[index]) if index < len(scores) else 0.0
        box = boxes[index] if index < len(boxes) else None
        lines.append(
            {
                "text": value,
                "confidence": round(score * 100 if score <= 1 else score, 2),
                "bounding_box": to_plain_box(box),
                "page_number": page_number,
                "line_number": index + 1,
            }
        )
    return lines


def parse_legacy_result(raw: Any, page_number: int) -> list[dict[str, Any]]:
    lines: list[dict[str, Any]] = []

    def visit(node: Any):
        if node is None:
            return
        if isinstance(node, (list, tuple)) and len(node) >= 2:
            box = node[0]
            rec = node[1]
            if isinstance(rec, (list, tuple)) and len(rec) >= 2 and isinstance(rec[0], str):
                score = float(rec[1] or 0)
                lines.append(
                    {
                        "text": rec[0].strip(),
                        "confidence": round(score * 100 if score <= 1 else score, 2),
                        "bounding_box": to_plain_box(box),
                        "page_number": page_number,
                        "line_number": len(lines) + 1,
                    }
                )
                return
        if isinstance(node, (list, tuple)):
            for item in node:
                visit(item)

    visit(raw)
    return [line for line in lines if line["text"]]


def run_engine(image_path: Path, lang: str, page_number: int = 1) -> list[dict[str, Any]]:
    engine = get_engine(lang)
    if hasattr(engine, "predict"):
        raw = engine.predict(str(image_path))
    else:
        raw = engine.ocr(str(image_path), cls=True)

    modern_lines: list[dict[str, Any]] = []
    if isinstance(raw, list):
        for item in raw:
            modern_lines.extend(parse_modern_result(item, page_number))
    else:
        modern_lines.extend(parse_modern_result(raw, page_number))
    if modern_lines:
        return modern_lines
    return parse_legacy_result(raw, page_number)


def split_low_confidence_words(lines: list[dict[str, Any]], threshold: float = 70) -> list[dict[str, Any]]:
    words: list[dict[str, Any]] = []
    for line in lines:
        for word in line["text"].split():
            if line["confidence"] < threshold:
                words.append(
                    {
                        "text": word,
                        "confidence": line["confidence"],
                        "page_number": line["page_number"],
                        "line_number": line["line_number"],
                        "bounding_box": line["bounding_box"],
                    }
                )
    return words[:80]


@app.get("/health")
def health():
    try:
        get_engine(normalize_lang(DEFAULT_LANG))
        ready = True
        error = None
    except Exception as exc:
        ready = False
        error = str(exc)
    return {"app": APP_NAME, "engine": "PaddleOCR", "ready": ready, "lang": DEFAULT_LANG, "error": error}


@app.post("/ocr/image")
async def ocr_image(
    file: UploadFile = File(...),
    lang: str = Form(DEFAULT_LANG),
    profile: str = Form("image"),
    page_number: int = Form(1),
):
    image_path = prepare_image(file)
    resolved_lang = normalize_lang(lang)
    try:
        lines = run_engine(image_path, resolved_lang, page_number=page_number)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        image_path.unlink(missing_ok=True)

    text = "\n".join(line["text"] for line in lines).strip()
    confidence = round(sum(line["confidence"] for line in lines) / max(1, len(lines)), 2)
    return {
        "engine": "PaddleOCR",
        "profile": profile,
        "text": text,
        "confidence_score": confidence,
        "detected_language": resolved_lang,
        "page_number": page_number,
        "lines": lines,
        "low_confidence_words": split_low_confidence_words(lines),
        "layout_blocks": [
            {"type": "text", "text": line["text"], "bounding_box": line["bounding_box"], "confidence": line["confidence"]}
            for line in lines
        ],
    }
