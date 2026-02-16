# Script para importar todos os backups SQL para o Heroku Postgres
# Requer: PostgreSQL instalado com psql.exe

$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$backupDir = ".\db_backup"

# Verificar se psql existe
if (-not (Test-Path $psqlPath)) {
    # Tentar encontrar em outras versoes
    $versions = @("18", "17", "16", "15", "14", "13")
    $found = $false
    foreach ($ver in $versions) {
        $testPath = "C:\Program Files\PostgreSQL\$ver\bin\psql.exe"
        if (Test-Path $testPath) {
            $psqlPath = $testPath
            $found = $true
            Write-Host "Encontrado psql versao $ver"
            break
        }
    }
    if (-not $found) {
        Write-Host "psql.exe nao encontrado. Instale o PostgreSQL ou ajuste o caminho."
        exit 1
    }
}

# Obter DATABASE_URL
Write-Host "Obtendo DATABASE_URL do Heroku..."
$databaseUrl = & heroku config:get DATABASE_URL
if (-not $databaseUrl) {
    Write-Host "Nao foi possivel obter DATABASE_URL"
    exit 1
}
Write-Host "DATABASE_URL obtido"
Write-Host ""

# Ordem correta de importacao (respeitando foreign keys)
$files = @(
    "teams_rows.sql",
    "tournaments_rows.sql",
    "tournament_teams_rows.sql",
    "match_days_rows.sql",
    "matches_rows.sql",
    "user_rows.sql",
    "account_rows.sql",
    "session_rows.sql",
    "bets_rows.sql"
)

foreach ($file in $files) {
    $filePath = Join-Path $backupDir $file
    if (Test-Path $filePath) {
        Write-Host "Importando: $file"
        & $psqlPath $databaseUrl -f $filePath
        if ($LASTEXITCODE -eq 0) {
            Write-Host "$file importado com sucesso!"
        } else {
            Write-Host "Erro ao importar $file"
        }
        Write-Host ""
    } else {
        Write-Host "Arquivo nao encontrado: $file"
    }
}

Write-Host "Importacao concluida!"
