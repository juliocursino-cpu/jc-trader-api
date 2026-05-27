@echo off
title JC Trader - Iniciar Backend e Frontend
color 0A

echo ============================================
echo        JC TRADER - START LOCAL
echo ============================================
echo.

REM Ajuste estes caminhos se suas pastas tiverem nomes diferentes:
set BACKEND_DIR=C:\Users\USUARIO\jc-trader-new
set FRONTEND_DIR=C:\Users\USUARIO\jc-trader-new

echo Verificando pastas...
echo Backend:  %BACKEND_DIR%
echo Frontend: %FRONTEND_DIR%
echo.

if not exist "%BACKEND_DIR%" (
  echo [ERRO] Pasta do backend nao encontrada:
  echo %BACKEND_DIR%
  echo.
  echo Edite este arquivo .bat e corrija BACKEND_DIR.
  pause
  exit /b
)

if not exist "%FRONTEND_DIR%" (
  echo [ERRO] Pasta do frontend nao encontrada:
  echo %FRONTEND_DIR%
  echo.
  echo Edite este arquivo .bat e corrija FRONTEND_DIR.
  pause
  exit /b
)

echo Iniciando BACKEND na porta 3001...
start "JC Trader Backend" cmd /k "cd /d %BACKEND_DIR% && npm install && node server.js"

timeout /t 5 /nobreak >nul

echo Iniciando FRONTEND na porta 5173...
start "JC Trader Frontend" cmd /k "cd /d %FRONTEND_DIR% && npm install && npm run dev"

echo.
echo ============================================
echo Abra no navegador:
echo http://localhost:5173/
echo.
echo Teste backend:
echo http://localhost:3001/api/jogos-janela/betfair
echo ============================================
echo.
pause
