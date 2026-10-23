@echo off
setlocal
rem Feche todas as janelas do Chrome antes de abrir este atalho.
rem Nao encerra processos nem modifica o driver ou o cadastro da impressora.
echo Feche TODAS as janelas do Chrome antes de continuar.
echo A impressao usara o ultimo destino selecionado no Chrome.
echo Escolha POS-80 no teste antes de usar este atalho.
pause
set "CASEIRINHO_CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CASEIRINHO_CHROME%" set "CASEIRINHO_CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CASEIRINHO_CHROME%" set "CASEIRINHO_CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not exist "%CASEIRINHO_CHROME%" (
 echo Google Chrome nao encontrado. Instale-o ou confira o caminho.
 pause
 exit /b 1
)
start "" "%CASEIRINHO_CHROME%" --kiosk-printing --app="https://jonataspos90-source.github.io/caseirinho-erp/terminal-impressao.html"
endlocal
