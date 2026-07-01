$ErrorActionPreference = "Stop"
Write-Host "RIPTWOSEC.SCAN PaddleOCR Local Service" -ForegroundColor Cyan

if (!(Test-Path ".venv")) {
  python -m venv .venv
}

$python = ".\.venv\Scripts\python.exe"
& $python -m pip install --upgrade pip
& $python -m pip install -r requirements.txt
& $python -m uvicorn main:app --host 127.0.0.1 --port 8765 --reload
