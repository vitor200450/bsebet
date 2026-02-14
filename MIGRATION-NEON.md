# Migração do Supabase para Neon (Redução de Custo)

## Por que Migrar?

| Recurso | Supabase Free | Neon Free |
|---------|---------------|-----------|
| **Egress** | 2GB/mês | 5GB/mês |
| **Armazenamento** | 500MB | 512MB |
| **Conexões** | 30 | Sem limite direto |
| **Auto-suspend** | ❌ | ✅ (economiza recursos) |

## Passo a Passo

### 1. Criar Projeto no Neon

1. Acesse [console.neon.tech](https://console.neon.tech)
2. Clique em **"New Project"**
3. Configure:
   - **Name**: `bsebet-prod`
   - **Region**: `South America (São Paulo)`
   - **Database**: `neondb`
4. Clique **"Create Project"**
5. Copie a **Connection String** ( aparece na tela de sucesso )

### 2. Backup do Supabase

```bash
# No terminal, rode:
pg_dump "postgresql://postgres.ruxfadkwvvcsdunmhdcq:BrawlStars2004!@aws-1-sa-east-1.pooler.supabase.com:5432/postgres" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  > bsebet-backup.sql
```

### 3. Restore no Neon

```bash
# Use a connection string do Neon (substitua os valores)
psql "postgresql://neondb_owner:xxxxx@ep-xxxxx.sa-east-1.aws.neon.tech/neondb?sslmode=require" \
  < bsebet-backup.sql
```

### 4. Atualizar .env.production

```env
# Antigo (Supabase)
# DATABASE_URL=postgresql://postgres.ruxfadkwvvcsdunmhdcq:...supabase.com:5432/postgres

# Novo (Neon)
DATABASE_URL=postgresql://neondb_owner:xxxxx@ep-xxxxx.sa-east-1.aws.neon.tech/neondb?sslmode=require
```

### 5. Testar Conexão

```bash
bun run db:studio:prod
```

### 6. Deploy da Aplicação

```bash
# Verifique se tudo funciona
bun run check-types
bun run build

# Deploy para Cloudflare
bun run deploy
```

## Otimizações Pós-Migração

### Habilitar Connection Pooler no Neon

1. No dashboard do Neon, vá em **"Connection Pooler"**
2. Ative o PgBouncer (reduz conexões ativas)
3. Use a URL de pooler no seu `.env.production`:
   ```env
   DATABASE_URL=postgresql://neondb_owner:xxxxx@ep-pooler-xxxxx.sa-east-1.aws.neon.tech/neondb?sslmode=require
   ```

### Monitorar Egress

No dashboard do Neon:
- **Billing** → veja consumo de egress em tempo real
- Configure alertas em **Settings > Alerts**

## Rollback (Se Precisar Voltar)

Se algo der errado, simplesmente volte a connection string do Supabase no seu `.env.production` e redeploy.

Os dados no Supabase permanecem intactos durante a migração.
