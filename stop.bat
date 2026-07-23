@echo off
setlocal
cd /d "%~dp0"
title Stock Perfecto - detener

echo Deteniendo Supabase local...
call npx supabase stop

echo Deteniendo contenedores de docker compose ^(si los hay^)...
docker compose down >nul 2>&1

echo.
echo Listo. Todo detenido.
pause
endlocal
