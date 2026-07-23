@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title Stock Perfecto

REM ============================================================
REM  Puertos FIJOS del proyecto (no cambian):
REM    Aplicacion .......... 3100
REM    Supabase API ........ 44321
REM    Supabase Base datos . 44322
REM    Supabase Studio ..... 44323
REM ============================================================
set "APP_PORT=3100"
set "APP_WIN=StockPerfectoServidor"

cls
echo ============================================================
echo    STOCK PERFECTO
echo ============================================================
echo.

REM ---------- 1. Docker ----------
docker info >nul 2>&1
if errorlevel 1 (
  echo  [ERROR] Docker Desktop no esta corriendo.
  echo          Abrelo, espera a que termine de iniciar y vuelve a ejecutar.
  echo.
  pause
  exit /b 1
)
echo  [1/4] Docker .................... OK

REM ---------- 2. Dependencias ----------
if not exist "node_modules" (
  echo  [2/4] Instalando dependencias, esto tarda un momento...
  call npm install
  if errorlevel 1 (
    echo.
    echo  [ERROR] Fallo la instalacion de dependencias.
    pause
    exit /b 1
  )
) else (
  echo  [2/4] Dependencias .............. OK
)

REM ---------- 3. Configuracion ----------
if not exist ".env.local" (
  echo  [3/4] Generando .env.local para entorno local...
  > ".env.local" echo # Configuracion de Supabase LOCAL - generado por run.bat
  >> ".env.local" echo NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:44321
  >> ".env.local" echo NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
  >> ".env.local" echo SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
) else (
  echo  [3/4] Configuracion ............. OK
)

REM ---------- 4. Base de datos + aplicacion ----------
echo  [4/4] Iniciando base de datos y aplicacion...
echo.
call npx supabase start
if errorlevel 1 (
  echo.
  echo  [ERROR] No se pudo iniciar la base de datos.
  pause
  exit /b 1
)

start "%APP_WIN%" /min cmd /c "npm run dev"

echo.
echo  Esperando a que la aplicacion responda en el puerto %APP_PORT%...
call :esperar
if "!APP_OK!"=="0" (
  echo.
  echo  [ERROR] La aplicacion no respondio en el puerto %APP_PORT%.
  call :bajar
  echo.
  pause
  exit /b 1
)

start "" http://localhost:%APP_PORT%

cls
echo ============================================================
echo    STOCK PERFECTO EN EJECUCION
echo ============================================================
echo.
echo    Aplicacion .......... http://localhost:%APP_PORT%
echo    Supabase Studio ..... http://localhost:44323
echo.
echo ------------------------------------------------------------
echo    Deja esta ventana abierta mientras usas la aplicacion.
echo.
echo    Presiona cualquier tecla para DETENER TODO
echo    (aplicacion y base de datos).
echo ------------------------------------------------------------
echo.
pause >nul

call :bajar
echo.
echo  Todo detenido correctamente.
ping -n 4 127.0.0.1 >nul
exit /b 0


REM ==================== subrutinas ====================

:esperar
set "APP_OK=0"
for /l %%i in (1,1,60) do (
  if "!APP_OK!"=="0" (
    curl -s -o nul --max-time 2 "http://localhost:%APP_PORT%/" >nul 2>&1
    if not errorlevel 1 (
      set "APP_OK=1"
    ) else (
      ping -n 2 127.0.0.1 >nul
    )
  )
)
exit /b

:bajar
echo.
echo  Deteniendo la aplicacion...
taskkill /FI "WINDOWTITLE eq %APP_WIN%*" /T /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":%APP_PORT% .*LISTENING"') do taskkill /F /T /PID %%a >nul 2>&1
echo  Deteniendo la base de datos...
call npx supabase stop >nul 2>&1
exit /b
