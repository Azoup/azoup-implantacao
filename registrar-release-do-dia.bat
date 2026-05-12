@echo off
REM Implantação Azoup — checklist e sugestão de versão para um pacote do dia
chcp 65001 >nul
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo Instale Python 3.9+ ou adicione-o ao PATH para ver a checklist.
  echo.
  echo Passos manuais:
  echo   1^) Editar src\constants\releaseNotes.ts e CHANGELOG.md
  echo   2^) Alinhar package.json, package-lock.json, src\constants\appMeta.ts
  echo   3^) Opcional: commit_release.bat
  pause
  exit /b 1
)

python scripts\release_do_dia.py %*
echo.
pause
exit /b 0
