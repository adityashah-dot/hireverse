@echo off
echo ============================================
echo   HireVerse AI Interview Service
echo   Starting FastAPI on port 8000...
echo ============================================
echo.

REM Check if venv exists, create if not
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    echo Installing dependencies...
    venv\Scripts\pip install -r requirements.txt
)

REM Activate virtual environment and start server
call venv\Scripts\activate
echo Starting server...
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
