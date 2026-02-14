@echo off
chcp 65001 >nul
echo ==========================================
echo   CONFIGURACAO HEROKU - BSEBET
echo ==========================================
echo.

REM Definir caminho do Heroku
set "HEROKU_CMD=C:\Program Files\Heroku\bin\heroku.cmd"

REM Verificar se Heroku CLI existe
if not exist "%HEROKU_CMD%" (
    echo ❌ Heroku CLI nao encontrado em:
    echo    %HEROKU_CMD%
    echo.
    echo Instale o Heroku CLI e tente novamente.
    pause
    exit /b 1
)

echo ✅ Heroku CLI encontrado
echo.

REM Verificar login - COM OUTPUT VISIVEL
echo 🔑 Verificando login no Heroku...
echo    (Se pedir login, execute: "%HEROKU_CMD%" login)
echo.

"%HEROKU_CMD%" auth:whoami
if errorlevel 1 (
    echo.
    echo ❌ Voce nao esta logado no Heroku!
    echo.
    echo Execute este comando primeiro:
    echo    "%HEROKU_CMD%" login
    echo.
    echo Depois de fazer login, execute este script novamente.
    pause
    exit /b 1
)

echo.
echo ✅ Logado no Heroku
echo.

REM Criar app
echo 🚀 Criando app 'bsebet-prod'...
"%HEROKU_CMD%" create bsebet-prod

REM Nao verifica erro aqui pois o app pode ja existir
echo.

REM Adicionar Postgres
echo 🗄️  Adicionando Postgres (plano Mini - $5/mes)...
"%HEROKU_CMD%" addons:create heroku-postgresql:mini -a bsebet-prod

if errorlevel 1 (
    echo.
    echo ⚠️  Postgres pode ja estar configurado.
    echo    Continuando...
)

echo.
echo ⏳ Aguardando provisionamento...
echo    (Isso pode levar alguns segundos)
timeout /t 10 /nobreak >nul

echo.
echo 📋 Informacoes do banco:
"%HEROKU_CMD%" pg:info -a bsebet-prod

echo.
echo ==========================================
echo   🎉 CONFIGURACAO INICIAL CONCLUIDA!
echo ==========================================
echo.
echo PROXIMOS PASSOS:
echo.
echo 1️⃣  Obter DATABASE_URL:
echo     "%HEROKU_CMD%" config:get DATABASE_URL -a bsebet-prod

echo.
echo 2️⃣  Atualizar .env.production com a URL acima

echo.
echo 3️⃣  Migrar dados do banco local:
echo     bun run scripts/migrate-to-heroku.ts

echo.
echo 4️⃣  Configurar variaveis R2 no Heroku:
echo     "%HEROKU_CMD%" config:set R2_ENDPOINT=https://... -a bsebet-prod

echo.
echo 5️⃣  Fazer deploy:
echo     git push heroku main

echo.
echo 💡 DICA: Copie os comandos acima e execute um por vez
pause
