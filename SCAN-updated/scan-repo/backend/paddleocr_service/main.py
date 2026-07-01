from __future__ import annotations

import os
import json
import re
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


def save_upload_to_temp(upload: UploadFile, suffix: str | None = None) -> Path:
    suffix = suffix or Path(upload.filename or "scan.bin").suffix or ".bin"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp:
        temp.write(upload.file.read())
        return Path(temp.name)


def prepare_image(upload: UploadFile) -> Path:
    suffix = Path(upload.filename or "scan.png").suffix or ".png"
    temp_path = save_upload_to_temp(upload, suffix=suffix)

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


def build_response(
    lines: list[dict[str, Any]],
    resolved_lang: str,
    profile: str,
    page_number: int = 1,
    method: str = "ocr",
) -> dict[str, Any]:
    text = "\n".join(line["text"] for line in lines).strip()
    confidence = round(sum(line["confidence"] for line in lines) / max(1, len(lines)), 2)
    return {
        "engine": "PaddleOCR",
        "profile": profile,
        "method": method,
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


def ocr_image_path(
    image_path: Path,
    resolved_lang: str,
    profile: str = "image",
    page_number: int = 1,
    method: str = "ocr",
) -> dict[str, Any]:
    lines = run_engine(image_path, resolved_lang, page_number=page_number)
    return build_response(lines, resolved_lang, profile, page_number=page_number, method=method)


def is_blank_text(text: str | None) -> bool:
    compact = re.sub(r"\s+", "", text or "")
    meaningful = re.findall(r"[A-Za-z0-9ก-๙]", compact)
    return len(meaningful) < 3


def parse_page_spec(spec: str | None, total_pages: int) -> list[int]:
    value = (spec or "all").strip().lower()
    if value in {"", "all", "*", "ทุกหน้า"}:
        return list(range(1, total_pages + 1))

    pages: list[int] = []
    for chunk in re.split(r"[,;\s]+", value):
        if not chunk:
            continue
        if "-" in chunk:
            start_text, end_text = chunk.split("-", 1)
            if not start_text.isdigit() or not end_text.isdigit():
                raise ValueError(f"Invalid page range: {chunk}")
            start = max(1, int(start_text))
            end = min(total_pages, int(end_text))
            if start > end:
                start, end = end, start
            pages.extend(range(start, end + 1))
            continue
        if not chunk.isdigit():
            raise ValueError(f"Invalid page number: {chunk}")
        page_number = int(chunk)
        if 1 <= page_number <= total_pages:
            pages.append(page_number)

    ordered: list[int] = []
    seen: set[int] = set()
    for page_number in pages:
        if page_number not in seen:
            seen.add(page_number)
            ordered.append(page_number)
    return ordered


def text_layer_lines(text: str, page_number: int) -> list[dict[str, Any]]:
    lines: list[dict[str, Any]] = []
    for line_number, text_line in enumerate(text.splitlines(), start=1):
        value = text_line.strip()
        if not value:
            continue
        lines.append(
            {
                "text": value,
                "confidence": 98.0,
                "bounding_box": None,
                "page_number": page_number,
                "line_number": line_number,
            }
        )
    return lines


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
        return ocr_image_path(image_path, resolved_lang, profile=profile, page_number=page_number, method="ocr")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        image_path.unlink(missing_ok=True)


@app.post("/ocr/rescan")
async def ocr_rescan(
    file: UploadFile = File(...),
    lang: str = Form(DEFAULT_LANG),
    profile: str = Form("rescan"),
    page_number: int = Form(1),
):
    return await ocr_image(file=file, lang=lang, profile=profile, page_number=page_number)


@app.post("/ocr/zone")
async def ocr_zone(
    file: UploadFile = File(...),
    x: float = Form(...),
    y: float = Form(...),
    width: float = Form(...),
    height: float = Form(...),
    unit: str = Form("pixel"),
    lang: str = Form(DEFAULT_LANG),
    profile: str = Form("zone"),
    page_number: int = Form(1),
):
    image_path = prepare_image(file)
    resolved_lang = normalize_lang(lang)
    try:
        with Image.open(image_path) as image:
            image = image.convert("RGB")
            if unit.lower() in {"percent", "%"}:
                left = image.width * (x / 100)
                top = image.height * (y / 100)
                right = left + image.width * (width / 100)
                bottom = top + image.height * (height / 100)
            else:
                left = x
                top = y
                right = x + width
                bottom = y + height

            left_i = max(0, min(image.width - 1, int(round(left))))
            top_i = max(0, min(image.height - 1, int(round(top))))
            right_i = max(left_i + 1, min(image.width, int(round(right))))
            bottom_i = max(top_i + 1, min(image.height, int(round(bottom))))
            if right_i <= left_i or bottom_i <= top_i:
                raise HTTPException(status_code=400, detail="Invalid OCR crop zone")
            image.crop((left_i, top_i, right_i, bottom_i)).save(image_path)
        return ocr_image_path(image_path, resolved_lang, profile=profile, page_number=page_number, method="zone")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        image_path.unlink(missing_ok=True)


@app.post("/ocr/pdf")
async def ocr_pdf(
    file: UploadFile = File(...),
    lang: str = Form(DEFAULT_LANG),
    profile: str = Form("pdf"),
    pages: str = Form("all"),
    strategy: str = Form("auto"),
    skip_blank: bool = Form(True),
    dpi: int = Form(220),
):
    try:
        import fitz  # PyMuPDF
    except Exception as exc:  # pragma: no cover - dependency is installed locally
        raise HTTPException(status_code=500, detail="PyMuPDF is not installed. Run pip install -r requirements.txt") from exc

    resolved_lang = normalize_lang(lang)
    normalized_strategy = (strategy or "auto").lower()
    if normalized_strategy in {"text", "text-layer"}:
        normalized_strategy = "text-first"
    if normalized_strategy not in {"auto", "text-first", "ocr"}:
        normalized_strategy = "auto"
    render_dpi = max(120, min(420, int(dpi or 220)))
    pdf_path = save_upload_to_temp(file, suffix=".pdf")
    rendered_paths: list[Path] = []
    doc = None
    try:
        doc = fitz.open(str(pdf_path))
        try:
            selected_pages = parse_page_spec(pages, doc.page_count)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        if not selected_pages:
            raise HTTPException(status_code=400, detail="No PDF pages selected")

        page_payloads: list[dict[str, Any]] = []
        for page_number in selected_pages:
            page = doc.load_page(page_number - 1)
            layer_text = (page.get_text("text") or "").strip()
            use_text_layer = normalized_strategy in {"auto", "text-first"} and not is_blank_text(layer_text)
            if use_text_layer:
                page_payload = build_response(
                    text_layer_lines(layer_text, page_number),
                    resolved_lang,
                    profile,
                    page_number=page_number,
                    method="text-layer",
                )
            else:
                matrix = fitz.Matrix(render_dpi / 72, render_dpi / 72)
                pix = page.get_pixmap(matrix=matrix, alpha=False)
                with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as temp:
                    image_path = Path(temp.name)
                pix.save(str(image_path))
                rendered_paths.append(image_path)
                page_payload = ocr_image_path(
                    image_path,
                    resolved_lang,
                    profile=profile,
                    page_number=page_number,
                    method="ocr",
                )

            blank = is_blank_text(page_payload["text"])
            page_payload.update(
                {
                    "skipped_blank": bool(skip_blank and blank),
                    "char_count": len(re.sub(r"\s+", "", page_payload["text"])),
                    "source_has_text_layer": bool(layer_text),
                    "dpi": render_dpi if page_payload["method"] == "ocr" else None,
                }
            )
            page_payloads.append(page_payload)

        usable_pages = [page for page in page_payloads if not page["skipped_blank"]]
        combined_text = "\n\n".join(
            f"===== Page {page['page_number']} =====\n{page['text']}".strip() for page in usable_pages if page["text"].strip()
        ).strip()
        confidence = round(
            sum(page["confidence_score"] for page in usable_pages) / max(1, len(usable_pages)),
            2,
        )
        all_low_words = [word for page in page_payloads for word in page["low_confidence_words"]][:160]
        all_layout_blocks = [
            {**block, "page_number": page["page_number"]}
            for page in page_payloads
            for block in page["layout_blocks"]
        ][:400]
        return {
            "engine": "PaddleOCR",
            "profile": profile,
            "method": "pdf-auto" if normalized_strategy == "auto" else normalized_strategy,
            "text": combined_text,
            "confidence_score": confidence,
            "detected_language": resolved_lang,
            "page_count": doc.page_count,
            "selected_pages": selected_pages,
            "pages": page_payloads,
            "low_confidence_words": all_low_words,
            "layout_blocks": all_layout_blocks,
            "strategy": normalized_strategy,
            "skip_blank": skip_blank,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if doc is not None:
            doc.close()
        pdf_path.unlink(missing_ok=True)
        for image_path in rendered_paths:
            image_path.unlink(missing_ok=True)
