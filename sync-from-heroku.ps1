# Script para sincronizar dados do Heroku para Docker local
# Requer: Docker Desktop rodando e heroku CLI

Write-Host "=== Sincronizacao Heroku -> Docker Local ===" -ForegroundColor Cyan

# 1. Verificar Docker
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[!] Docker nao encontrado ou nao rodando." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[!] Falha ao verificar Docker." -ForegroundColor Red
    exit 1
}

Write-Host "[+] Docker OK"

# 2. Verificar Container
$containerName = "bsebet-dev-db"
$containerRunning = docker ps --filter "name=$containerName" --format "{{.Names}}"
if (-not $containerRunning) {
    Write-Host "[*] Iniciando container $containerName..." -ForegroundColor Yellow
    docker start $containerName 2>$null
    if ($LASTEXITCODE -ne 0) {
        docker-compose up -d
    }
    Start-Sleep -Seconds 5
}
Write-Host "[+] Banco de dados local pronto"

# 3. Obter URL do Heroku
Write-Host "[*] Obtendo URL do banco em producao..." -ForegroundColor Yellow
$herokuDbUrl = heroku config:get DATABASE_URL
if (-not $herokuDbUrl -or $herokuDbUrl -notmatch "postgres") {
    Write-Host "[!] Nao foi possivel obter a URL do Heroku. Verifique o Heroku Login." -ForegroundColor Red
    exit 1
}
Write-Host "[+] URL obtida"

# 4. Criar Backup
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dumpFile = "heroku_backup_$timestamp.sql"
Write-Host "[*] Criando backup remoto em $dumpFile..." -ForegroundColor Yellow

# Tenta encontrar pg_dump.exe
$pgDump = "pg_dump" # Default in PATH
$commonPaths = @(
    "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe"
)
foreach ($p in $commonPaths) {
    if (Test-Path $p) { $pgDump = $p; break }
}

try {
    # Usar --no-owner e --no-privileges para evitar erros de permissao no local
    & $pgDump $herokuDbUrl --clean --if-exists --no-owner --no-privileges --no-password > $dumpFile
    if ($LASTEXITCODE -ne 0) { throw "Erro no pg_dump" }
    Write-Host "[+] Backup criado" -ForegroundColor Green
} catch {
    Write-Host "[!] Erro ao usar pg_dump direto. Tentando via heroku CLI..." -ForegroundColor Yellow
    heroku pg:backups:capture
    heroku pg:backups:download -o $dumpFile
}

# 5. Restaurar
Write-Host "[*] Restaurando dados no Docker local..." -ForegroundColor Yellow

# Limpar schema public local
docker exec -i $containerName psql -U postgres -d bsebet -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"

# Importar SQL
if (Test-Path $dumpFile) {
    Get-Content $dumpFile -Raw | docker exec -i $containerName psql -U postgres -d bsebet
    Write-Host "[+] Restauracao finalizada" -ForegroundColor Green
}

# 6. Validar
Write-Host "[*] Verificando tabelas..." -ForegroundColor Cyan
$tables = @("teams", "tournaments", "matches", "user")
foreach ($t in $tables) {
    $res = docker exec $containerName psql -U postgres -d bsebet -t -c "SELECT count(*) FROM $t;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        $count = "$res".Trim()
        Write-Host "  $t : $count registros"
    } else {
        Write-Host "  $t : Erro (tabela nao encontrada?)" -ForegroundColor Red
    }
}

# Limpeza
if (Test-Path $dumpFile) {
    Remove-Item $dumpFile
    Write-Host "[*] Arquivo temporario removido"
}

Write-Host "=== Sincronizacao Concluida! ===" -ForegroundColor Green
