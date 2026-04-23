@echo off
setlocal

REM Sempre executa a partir da pasta deste .bat
pushd "%~dp0"

echo ==========================================
echo           VynTask - Inicializacao
echo ==========================================
echo Pasta: %CD%
echo No GitHub, cada push/PR roda: lint, testes e build ^(veja .github\workflows\ci.yml^).
echo.

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERRO] NPM nao encontrado.
  echo Instale o Node.js LTS: https://nodejs.org/
  echo.
  pause
  popd
  exit /b 1
)

if not exist "node_modules" (
  echo Dependencias nao encontradas. Instalando...
  if exist "package-lock.json" (
    call npm ci
  ) else (
    call npm install
  )
  if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao instalar dependencias.
    pause
    popd
    exit /b 1
  )
)

echo.
echo Iniciando servidor de desenvolvimento...
echo (Use Ctrl+C para parar)
echo.
call npm run dev

echo.
echo Servidor encerrado.
pause
popd
endlocal
