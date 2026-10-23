@echo off
setlocal
title Caseirinho - Impressao automatica
echo CASEIRINHO - INICIALIZADOR DE IMPRESSAO V3
echo Salve seus trabalhos antes de fechar o Chrome.
echo Este atalho nao encerra programas automaticamente.
:checkChrome
tasklist /FI "IMAGENAME eq chrome.exe" /NH 2>nul | find /I "chrome.exe" >nul
if errorlevel 1 goto launch
echo.
echo O CHROME AINDA ESTA ABERTO, inclusive em segundo plano.
echo O modo automatico nao pode ser aplicado nessa sessao.
echo Feche o Chrome pelo menu de tres pontos - Sair.
echo Se continuar, abra Ctrl+Shift+Esc, localize Google Chrome
echo e encerre seus processos depois de salvar seus trabalhos.
echo Pressione uma tecla para verificar novamente.
pause >nul
goto checkChrome
:launch
set "CASEIRINHO_CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CASEIRINHO_CHROME%" set "CASEIRINHO_CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CASEIRINHO_CHROME%" set "CASEIRINHO_CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not exist "%CASEIRINHO_CHROME%" (
 echo Google Chrome nao encontrado.
 pause
 exit /b 1
)
echo Iniciando Monitor com impressao automatica...
start "" "%CASEIRINHO_CHROME%" --profile-directory=Default --kiosk-printing --app="https://jonataspos90-source.github.io/caseirinho-erp/terminal-impressao.html"
endlocal
