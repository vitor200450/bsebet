# Script para iniciar ambiente de desenvolvimento local
Set-Location $PSScriptRoot\..\..
# Garantir que o Windows use UTF-8 para o console
chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=== Iniciando Ambiente de Desenvolvimento ===" -ForegroundColor Cyan

# Verificar Docker
try {
    $null = docker info 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker não está rodando. Inicie o Docker Desktop primeiro." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Docker não está acessível." -ForegroundColor Red
    exit 1
}

# Iniciar containers
Write-Host "🚀 Iniciando PostgreSQL..." -ForegroundColor Yellow
docker-compose up -d

# Aguardar
Write-Host "⏳ Aguardando banco de dados..." -ForegroundColor Yellow
$attempts = 0
$maxAttempts = 30

while ($attempts -lt $maxAttempts) {
    try {
        $result = docker exec bsebet-dev-db pg_isready -U postgres 2>$null
        if ($result -match "accepting connections") {
            Write-Host "✅ PostgreSQL pronto!" -ForegroundColor Green
            break
        }
    } catch {}

    $attempts++
    Start-Sleep -Seconds 1
    Write-Host "." -NoNewline -ForegroundColor Yellow
}

if ($attempts -eq $maxAttempts) {
    Write-Host "`n❌ Timeout aguardando PostgreSQL" -ForegroundColor Red
    exit 1
}

# Verificar se banco tem dados
$hasData = docker exec bsebet-dev-db psql -U postgres -d bsebet -t -c "SELECT COUNT(*) FROM teams;" 2>$null
if (-not $hasData -or $hasData.Trim() -eq "0") {
    Write-Host "`n⚠️  Banco de dados local está vazio." -ForegroundColor Yellow
    Write-Host "Deseja sincronizar os dados da PRODUÇÃO (Heroku) agora? (Inicia o Heroku CLI)" -ForegroundColor Gray
    $response = Read-Host "Digite 'S' para SIM ou qualquer outra tecla para pular"
    if ($response -eq "s" -or $response -eq "S") {
        .\.dev\scripts\sync-from-heroku.ps1
    }
}

# Mostrar status
Write-Host "`n=== Status do Ambiente ===" -ForegroundColor Cyan
docker ps --filter "name=bsebet" --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"

Write-Host "`n=== Próximos passos ===" -ForegroundColor Green
Write-Host "1. Configure seu .env (caso não tenha feito):" -ForegroundColor White
Write-Host "   DATABASE_URL=postgresql://postgres:devpassword@localhost:5432/bsebet" -ForegroundColor Gray
Write-Host "2. Para sincronizar o banco a qualquer momento:" -ForegroundColor White
Write-Host "   bun run db:sync:dev" -ForegroundColor Gray
Write-Host "3. Inicie o app:" -ForegroundColor White
Write-Host "   bun run dev:web" -ForegroundColor Gray
