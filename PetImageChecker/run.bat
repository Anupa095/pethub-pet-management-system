@echo off
setlocal
echo Running Python backend for Pet Verification...
set "SCRIPT_DIR=%~dp0"
set "PROJECT_PYTHON=%SCRIPT_DIR%..\.venv\Scripts\python.exe"

if not exist "%PROJECT_PYTHON%" (
    echo Project venv not found, creating local venv...
    if not exist "%SCRIPT_DIR%venv\Scripts\python.exe" (
        python -m venv "%SCRIPT_DIR%venv"
    )
    set "PROJECT_PYTHON=%SCRIPT_DIR%venv\Scripts\python.exe"
)

cd /d "%SCRIPT_DIR%"
echo Installing requirements...
"%PROJECT_PYTHON%" -m pip install -r requirements.txt
echo Starting FastAPI application...
"%PROJECT_PYTHON%" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
