# Verificar dados do usuário admin no banco Heroku

$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

# Verificar se psql existe
if (-not (Test-Path $psqlPath)) {
    $versions = @("18", "17", "16", "15", "14", "13")
    foreach ($ver in $versions) {
        $testPath = "C:\Program Files\PostgreSQL\$ver\bin\psql.exe"
        if (Test-Path $testPath) {
            $psqlPath = $testPath
            break
        }
    }
}

$databaseUrl = & heroku config:get DATABASE_URL

Write-Host "=== Verificando tabela 'user' ==="
& $psqlPath $databaseUrl -c "SELECT id, name, email, role, created_at FROM public.user LIMIT 5;"

Write-Host "`n=== Verificando colunas da tabela 'user' ==="
& $psqlPath $databaseUrl -c "\d public.user"

Write-Host "`n=== Verificando dados na tabela 'account' ==="
& $psqlPath $databaseUrl -c "SELECT * FROM public.account LIMIT 3;"
