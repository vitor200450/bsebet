# Configuração Heroku para BSEBET

## Passo 1: Instalar Heroku CLI

```bash
# Windows (via scoop ou chocolatey)
scoop install heroku
# ou
choco install heroku-cli

# Verificar instalação
heroku --version
```

## Passo 2: Login no Heroku

```bash
heroku login
# Isso abrirá o navegador para autenticação
```

## Passo 3: Criar App

```bash
heroku create bsebet-prod
```

## Passo 4: Adicionar Postgres

```bash
# Plano Mini - $5/mês (suficiente para começar)
heroku addons:create heroku-postgresql:mini -a bsebet-prod

# Verificar status
heroku pg:info -a bsebet-prod
```

## Passo 5: Obter DATABASE_URL

```bash
heroku config:get DATABASE_URL -a bsebet-prod
```

A URL será algo como:
```
postgresql://username:password@host.compute-1.amazonaws.com:5432/database
```

## Passo 6: Configurar SSL

O Heroku Postgres requer SSL. Atualize o `packages/db/src/index.ts`:

```typescript
const conn =
  globalForDb.conn ??
  postgres(env.DATABASE_URL, {
    ssl: env.DATABASE_URL?.includes("amazonaws")
      ? { rejectUnauthorized: false } // Heroku SSL
      : env.DATABASE_URL?.includes("localhost")
        ? false
        : "require",
    max: env.DATABASE_URL?.includes("amazonaws") ? 5 : 1,
    prepare: false,
  });
```

## Passo 7: Migrar Dados do Local para Heroku

```bash
# 1. Fazer dump do banco local
pg_dump -h localhost -p 5432 -U postgres bsebet > backup_local.sql

# 2. Importar para o Heroku
heroku pg:psql -a bsebet-prod < backup_local.sql

# Ou usar o comando push (mais fácil)
heroku pg:push bsebet DATABASE_URL -a bsebet-prod
```

## Passo 8: Atualizar .env.production

```env
DATABASE_URL=postgresql://... (URL do Heroku)
```

## Passo 9: Deploy

```bash
# Adicionar remote do Heroku
git remote add heroku https://git.heroku.com/bsebet-prod.git

# Deploy
git push heroku main
```

## Comandos Úteis

```bash
# Ver logs
heroku logs --tail -a bsebet-prod

# Abrir console do banco
heroku pg:psql -a bsebet-prod

# Ver variáveis de ambiente
heroku config -a bsebet-prod

# Configurar variáveis
heroku config:set R2_ENDPOINT=https://... -a bsebet-prod
heroku config:set R2_ACCESS_KEY_ID=... -a bsebet-prod
heroku config:set R2_SECRET_ACCESS_KEY=... -a bsebet-prod
heroku config:set R2_BUCKET_NAME=bsebet-logos -a bsebet-prod
heroku config:set R2_PUBLIC_URL=https://logos.bsebfantasy.me -a bsebet-prod
```
