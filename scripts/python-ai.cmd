@echo off
setlocal
set "AI_PYTHON=%~dp0..\ai-service\.venv\Scripts\python.exe"

if not exist "%AI_PYTHON%" (
  echo The ai-service virtual environment is missing. 1>&2
  exit /b 1
)

set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"
"%AI_PYTHON%" %*
exit /b %ERRORLEVEL%
