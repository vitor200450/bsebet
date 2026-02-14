@echo off
chcp 65001 >nul
echo ==========================================
echo   CONFIGURACAO HEROKU - BSEBET
echo ==========================================
echo.

set "HEROKU_CMD=C:\Program Files\Heroku\bin\heroku.cmd"

REM Verificar se Heroku CLI existe
if not exist "%HEROKU_CMD%" (
    echo ❌ Heroku CLI nao encontrado em:
    echo    %HEROKU_CMD%
    pause
    exit /b 1
)

echo ✅ Heroku CLI encontrado
echo.

REM Testar login
echo 🔑 Testando login no Heroku...
for /f "tokens=*" %%a in ('"%HEROKU_CMD%" auth:whoami 2^>nul') do set HEROKU_USER=%%a

if "%HEROKU_USER%"=="" (
    echo ❌ Voce nao esta logado no Heroku!
    echo.
    echo Execute este comando primeiro:
    echo    "%HEROKU_CMD%" login
    echo.
    pause
    exit /b 1
)

echo ✅ Logado como: %HEROKU_USER%
echo.

REM Criar app
echo 🚀 Criando app 'bsebet-prod'...
"%HEROKU_CMD%" create bsebet-prod 2>nul
echo.

REM Adicionar Postgres
echo 🗄️ Adicionando Postgres Mini ($5/mes)...
"%HEROKU_CMD%" addons:create heroku-postgresql:mini -a bsebet-prod
echo.

REM Aguardar
echo ⏳ Aguardando provisionamento (10 segundos)...
timeout /t 10 /nobreak >nul
echo.

REM Info do banco
echo 📋 Informacoes do banco:
"%HEROKU_CMD%" pg:info -a bsebet-prod
echo.

REM Mostrar DATABASE_URL
echo 🔑 DATABASE_URL (copie este valor):
"%HEROKU_CMD%" config:get DATABASE_URL -a bsebet-prod
echo.

echo ==========================================
echo ✅ CONFIGURACAO CONCLUIDA!
echo ==========================================
echo.
echo PROXIMOS PASSOS:
echo.
echo 1. Copie a DATABASE_URL acima
echo 2. Cole no arquivo .env.production
echo 3. Execute: bun run scripts/migrate-to-heroku.ts
echo.
pause
