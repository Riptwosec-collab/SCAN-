$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
  Write-Host "Virtual env not found. Create it first:"
  Write-Host "  py -m venv .venv"
  Write-Host "  .\.venv\Scripts\Activate.ps1"
  Write-Host "  python -m pip install paddlepaddle==3.2.0 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/"
  Write-Host "  python -m pip install -r requirements.txt"
  exit 1
}

.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8765
