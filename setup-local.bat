@echo off
chcp 65001 >nul
echo ==========================================
echo  BSEBET - Setup de Ambiente Local
echo ==========================================
echo.

REM Verificar se Docker está instalado
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker não encontrado!
    echo Baixe em: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo ✅ Docker encontrado

REM Verificar se container já existe
docker ps -a | findstr "bsebet-dev-db" >nul
if errorlevel 1 (
    echo 🚀 Criando banco de dados local...
    docker-compose up -d
) else (
    echo 🔄 Iniciando banco existente...
    docker-compose start
)

REM Aguardar PostgreSQL iniciar
echo ⏳ Aguardando PostgreSQL iniciar...
timeout /t 3 /nobreak >nul

REM Verificar se está rodando
docker ps | findstr "bsebet-dev-db" >nul
if errorlevel 1 (
    echo ❌ Falha ao iniciar o banco de dados
    echo Verifique os logs: docker-compose logs postgres
    pause
    exit /b 1
)

echo ✅ Banco de dados rodando!

REM Criar .env.local se não existir
if not exist ".env.local" (
    echo 📝 Criando .env.local...
    copy .env .env.local

    REM Substituir DATABASE_URL no .env.local
    powershell -Command "(Get-Content .env.local) -replace 'DATABASE_URL=.*', 'DATABASE_URL=postgresql://postgres:devpassword@localhost:5432/bsebet' | Set-Content .env.local"

    echo ✅ .env.local configurado
) else (
    echo ℹ️  .env.local já existe
)

echo.
echo ==========================================
echo  ✅ Setup Completo!
echo ==========================================
echo.
echo Próximos passos:
echo 1. Instale as dependências: bun install
echo 2. Aplique as migrações: bun run db:push
echo 3. Inicie o servidor: bun run dev
echo.
echo Comandos úteis:
echo - Parar banco: docker-compose stop
echo - Iniciar banco: docker-compose start
echo - Ver logs: docker-compose logs -f postgres
echo.
pause
