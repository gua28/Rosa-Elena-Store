@echo off
title Creaciones Rosa Elena - Iniciando...
color 0D

echo.
echo  ====================================================
echo      CREACIONES ROSA ELENA - Iniciando Tienda...
echo  ====================================================
echo.
echo  [1/2] Iniciando servidor Backend (Base de datos + IA)...
cd /d "%~dp0backend"
start "Backend - Rosa Elena" cmd /k "python -m uvicorn main:app --reload --port 8000 --host 0.0.0.0"

echo  [2/2] Iniciando servidor Frontend (Pagina web)...
cd /d "%~dp0frontend"
start "Frontend - Rosa Elena" cmd /k "npm run dev"

timeout /t 4 /nobreak >nul

echo.
echo  ====================================================
echo   Todo listo! Abre tu navegador en:
echo   http://localhost:5173
echo  ====================================================
echo.
echo  Puedes cerrar esta ventana. Las otras 2 ventanas
echo  negras deben permanecer abiertas mientras uses
echo  la tienda.
echo.
pause
