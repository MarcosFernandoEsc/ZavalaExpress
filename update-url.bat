@echo off
REM Script para actualizar URL en ambas apps rápidamente
REM Uso: update-url.bat "https://tu-url-aqui"

if "%1"=="" (
  echo Uso: update-url.bat "https://tu-url-aqui"
  echo Ejemplo: update-url.bat "https://zavala.empresa.com"
  exit /b 1
)

setlocal enabledelayedexpansion
set URL=%1

echo Actualizando URL a: %URL%

REM Actualizar desktop
powershell -Command "(Get-Content 'desktop\config.json') -replace '\"appUrl\": \"[^\"]*\"', '\"appUrl\": \"%URL%\"' | Set-Content 'desktop\config.json'"
echo OK: desktop/config.json

REM Actualizar mobile
powershell -Command "(Get-Content 'mobile\capacitor.config.json') -replace '\"url\": \"[^\"]*\"', '\"url\": \"%URL%\"' | Set-Content 'mobile\capacitor.config.json'"
echo OK: mobile/capacitor.config.json

echo.
echo URL configurada en ambas apps:
findstr /R "appUrl.*url" desktop\config.json mobile\capacitor.config.json

echo.
echo Listo para compilar.
