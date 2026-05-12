@echo off
setlocal ENABLEDELAYEDEXPANSION

REM ============================================================
REM Implantação Azoup — bump PATCH + git add + commit + push
REM Use depois de alinhar CHANGELOG / releaseNotes / appMeta para um pacote.
REM Para só ver checklist e sugestao de versao: registrar-release-do-dia.bat
REM ============================================================

cd /d "%~dp0"

echo.
echo [1/6] Verificando repositorio git...
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo ERRO: esta pasta nao eh um repositorio git.
  pause
  exit /b 1
)

echo.
echo [2/6] Lendo versao atual...
for /f %%v in ('node -p "require('./package.json').version"') do set CURRENT_VERSION=%%v
if "%CURRENT_VERSION%"=="" (
  set CURRENT_VERSION=1.0.0
)
echo Versao atual detectada: v%CURRENT_VERSION%

echo.
echo [3/6] Calculando proxima versao (+0.0.1)...
for /f %%v in ('node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('package.json','utf8')); let v=(p.version||'1.0.0').trim(); if(!/^\\d+\\.\\d+\\.\\d+$/.test(v)) v='1.0.0'; const parts=v.split('.').map(Number); parts[2]+=1; const next=parts.join('.'); process.stdout.write(next);"') do set NEW_VERSION=%%v
if "%NEW_VERSION%"=="" (
  echo ERRO: nao foi possivel calcular a nova versao.
  pause
  exit /b 1
)
echo Proxima versao: v%NEW_VERSION%

echo.
echo [4/6] Aplicando nova versao em package.json + package-lock.json...
npm version %NEW_VERSION% --no-git-tag-version --allow-same-version
if errorlevel 1 (
  echo ERRO ao atualizar versao.
  pause
  exit /b 1
)

echo.
echo [5/6] Adicionando arquivos modificados...
git add -A
if errorlevel 1 (
  echo ERRO no git add.
  pause
  exit /b 1
)

echo.
echo [6/6] Criando commit...
git commit -m "chore: release v%NEW_VERSION%"
if errorlevel 1 (
  echo ERRO no commit (ou sem mudancas para commitar).
  pause
  exit /b 1
)

echo.
echo [7/6] Enviando para GitHub...
git push
if errorlevel 1 (
  echo ERRO no git push.
  pause
  exit /b 1
)

echo.
echo [8/6] Concluido com sucesso!
echo Nova versao: v%NEW_VERSION%
echo.
pause
exit /b 0
