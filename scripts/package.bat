@echo off
chcp 65001 >nul
cd /d "%~dp0\.."

echo ================================
echo   Travectory - Build & Package
echo ================================

:: Clean
echo [1/3] Clean build...
if exist "dist" rmdir /s /q "dist"
if exist ".next" rmdir /s /q ".next"

:: Build
echo [2/3] Build production...
call npm run build
if %ERRORLEVEL% NEQ 0 ( echo Build failed! & pause & exit /b 1 )

:: Package
echo [3/3] Package to dist\...
mkdir dist\data
xcopy ".next\standalone\." "dist\" /E /I /Q /Y /H
xcopy ".next\static" "dist\.next\static\" /E /I /Q /Y
xcopy "public" "dist\public\" /E /I /Q /Y 2>nul
copy ".env.local" "dist\.env.local" >nul 2>nul

:: Start script
(
echo @echo off
echo chcp 65001 ^>nul
echo title Travectory
echo echo ================================
echo echo   Travectory Roadbook Planner
echo echo ================================
echo echo.
echo echo Server starting...
echo echo Open http://localhost:3000
echo echo.
echo start "" http://localhost:3000
echo node server.js
echo pause
) > "dist\start.bat"

echo.
echo ================================
echo   Done! Output in dist\ folder
echo   Size: %~z0
echo.
echo   To share: zip the dist\ folder
echo   To run locally: double-click dist\start.bat
echo   Requires: Node.js installed
echo ================================
pause
