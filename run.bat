@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title Stock Perfecto

echo ============================================================
echo    STOCK PERFECTO  -  iniciando entorno local
echo ============================================================
echo.

REM --- 1) Docker en ejecucion (Supabase local lo necesita) ---
docker info >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker Desktop no esta corriendo.
  echo         Abrelo, espera a que inicie y vuelve a ejecutar este archivo.
  echo.
  pause
  exit /b 1
)

REM --- 2) Dependencias de Node ---
if not exist "node_modules" (
  echo [1/4] Instalando dependencias ^(solo la primera vez^)...
  call npm install
  if errorlevel 1 ( echo [ERROR] Fallo npm install. & pause & exit /b 1 )
) else (
  echo [1/4] Dependencias ya instaladas.
)

REM --- 3) Supabase local ---
echo [2/4] Iniciando Supabase local ^(Docker^)...
call npx supabase start
if errorlevel 1 ( echo [ERROR] No se pudo iniciar Supabase. & pause & exit /b 1 )

REM --- 3b) Llaves en .env.local ---
if not exist ".env.local" (
  echo.
  echo [AVISO] No existe .env.local.
  echo         Copia .env.local.example a .env.local y pega las llaves que
  echo         imprimio 'supabase start' aqui arriba ^(ANON_KEY y SERVICE_ROLE_KEY^).
  echo.
  pause
  exit /b 1
)

REM --- 4) Elegir un puerto libre (el 3000 suele tomarlo Docker/WSL) ---
set "PORT="
for %%p in (3000 3001 3002 3003 3004 3005) do (
  if not defined PORT (
    netstat -ano | findstr /r /c:":%%p .*LISTENING" >nul 2>&1
    if errorlevel 1 set "PORT=%%p"
  )
)
if not defined PORT set "PORT=3000"

echo [3/4] Puerto libre encontrado: !PORT!
echo [4/4] Iniciando la app...
echo.
echo    URL:  http://localhost:!PORT!
echo    * El navegador se abrira solo en unos segundos.
echo    * Para DETENER la app: pulsa Ctrl+C o cierra esta ventana.
echo      ^(la base de datos sigue viva; usa stop.bat para apagarla^)
echo.

REM Abrir el navegador tras 6s, en segundo plano
start "SP-navegador" /min cmd /c "timeout /t 6 >nul & start http://localhost:!PORT!"

REM Arrancar el servidor (Next lee la variable PORT). Bloqueante.
call npm run dev

endlocal
