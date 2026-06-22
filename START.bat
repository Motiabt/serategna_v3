@echo off
REM ── Serategna one-click dev launcher (Windows) ───────────────────────────────
cd /d "%~dp0"
echo.
echo   Serategna - installing dependencies (first run only)...
echo.
call npm run install:all || goto :error

echo.
echo   Setting up the database (generate + push + seed)...
echo.
call npm run setup || goto :error

echo.
echo   Starting API (:4000) and Web (:5173)...
echo   Open http://localhost:5173 in your browser.
echo.
call npm run dev
goto :eof

:error
echo.
echo   Something failed. Make sure Node.js 20+ is installed (node --version).
pause
