# ติดตั้งก่อนใช้งาน:
# pip install pythainlp

from pythainlp.corpus import thai_words
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
TXT_OUT = ROOT / "data" / "thai_5000_words.txt"
JSON_OUT = ROOT / "data" / "thai_5000_words.json"
JS_OUT = ROOT / "js" / "thai-word-bank.generated.js"

all_words = list(thai_words())
thai_5000 = [word.strip() for word in all_words[:5000] if word and word.strip()]

TXT_OUT.parent.mkdir(parents=True, exist_ok=True)
TXT_OUT.write_text("\n".join(thai_5000), encoding="utf-8")
JSON_OUT.write_text(json.dumps(thai_5000, ensure_ascii=False, indent=2), encoding="utf-8")
JS_OUT.write_text(
    "// Auto-generated from PyThaiNLP thai_words()\n"
    "window.THAI_WORD_BANK_GENERATED = "
    + json.dumps(thai_5000, ensure_ascii=False)
    + ";\n",
    encoding="utf-8",
)

print(f"ดึงข้อมูลเสร็จสิ้น! บันทึกคำศัพท์จำนวน {len(thai_5000)} คำ")
print(f"TXT : {TXT_OUT}")
print(f"JSON: {JSON_OUT}")
print(f"JS  : {JS_OUT}")
