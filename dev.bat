@echo off
echo Starting Lights Out server...
echo.

:: Kill any process using port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1

echo Open http://localhost:3000 in your browser
echo Press Ctrl+C to stop the server
echo.
python -m http.server 3000
