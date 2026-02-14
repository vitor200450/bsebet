# Configuração do CockroachDB para BSEBET

## Por que CockroachDB?

- ✅ PostgreSQL-compatível (mesmo dialecto do Drizzle ORM)
- ✅ Free tier permanente (5GB + 250M requests/mês)
- ✅ Global distribution (escolha a região mais próxima)
- ✅ Serverless (paga só pelo que usar além do free)

---

## Passo 1: Criar Conta e Cluster

1. Acesse: https://cockroachlabs.cloud/signup
2. Crie uma conta (pode usar Google/GitHub)
3. Clique em **"Create Cluster"**
4. Configure:
   - **Plan**: Select **"Serverless"**
   - **Cloud Provider**: AWS (recomendado) ou GCP
   - **Regions**: Escolha **"South America (São Paulo)"** se disponível, ou **"US East"**
   - **Cluster Name**: `bsebet-prod`
5. Clique **"Next"**

---

## Passo 2: Criar Usuário e Banco

1. Na página do cluster, vá em **"SQL Users"**
2. Clique **"Add User"**
3. Username: `bsebet`
4. Password: gere uma senha forte e **guarde com segurança**
5. Clique **"Save"**

6. Vá em **"Databases"** → **"Create Database"**
7. Nome: `bsebet`
8. Clique **"Create"**

---

## Passo 3: Pegar Connection String

1. Na página do cluster, clique em **"Connect"**
2. Selecione:
   - **User**: `bsebet`
   - **Database**: `bsebet`
   - **Network**: Selecione seu IP atual (ou `0.0.0.0/0` para qualquer IP - menos seguro)
3. Copie a **Connection String** no formato:
   ```
   postgresql://bsebet:<senha>@<host>.<regiao>.cockroachlabs.cloud:26257/bsebet?sslmode=verify-full
   ```

---

## Passo 4: Configurar .env.production

Substitua no arquivo `.env.production`:

```env
# Antigo (Supabase)
# DATABASE_URL=postgresql://postgres.ruxfadkwvvcsdunmhdcq:BrawlStars2004!@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require

# Novo (CockroachDB)
DATABASE_URL=postgresql://bsebet:<SUA_SENHA>@<HOST>.<REGIAO>.cockroachlabs.cloud:26257/bsebet?sslmode=verify-full
```

---

## Passo 5: Rodar Migrações

```bash
# Aplicar schema no CockroachDB
bun run db:push:prod

# Ou gerar migração e aplicar
bun run db:generate
bun run db:migrate:prod
```

---

## Passo 6: Migrar Dados (se tiver backup)

Se você tiver um dump do Supabase:

```bash
# Export do Supabase (se ainda conseguir acessar)
pg_dump "postgresql://postgres.ruxfadkwvvcsdunmhdcq:BrawlStars2004!@aws-1-sa-east-1.pooler.supabase.com:5432/postgres" > backup.sql

# Import para CockroachDB
psql "postgresql://bsebet:<SENHA>@<HOST>.<REGIAO>.cockroachlabs.cloud:26257/bsebet?sslmode=verify-full" < backup.sql
```

---

## ⚠️ Diferenças Importantes

### 1. SSL Mode
CockroachDB requer `sslmode=verify-full` (já incluído na connection string)

### 2. Dialetos SQL
A maioria é compatível, mas algumas funções podem ter sintaxe diferente:
- `SERIAL` → Funciona, mas Cockroach recomenda `UUID` ou `GENERATED ALWAYS AS IDENTITY`
- `NOW()` → ✅ Compatível
- `JSONB` → ✅ Compatível

### 3. Connection Pool
O CockroachDB tem limites de conexão no free tier. Configure no `packages/db/src/index.ts`:

```typescript
const conn = postgres(env.DATABASE_URL, {
  ssl: "verify-full",
  max: 5, // Reduzido para free tier
  prepare: false,
  idle_timeout: 20,
  connect_timeout: 10,
});
```

---

## 🔍 Troubleshooting

### Erro: "certificate verify failed"
Adicione o certificado CA ou use:
```env
DATABASE_URL=postgresql://...?sslmode=verify-ca&sslrootcert=/cockroach/cockroach.crt
```

### Erro: "too many connections"
Reduza o `max` no pool de conexões para 3-5.

### Erro: "database does not exist"
Certifique-se de criar o banco `bsebet` no dashboard antes.

---

## 📊 Monitoramento

No dashboard do CockroachDB:
- **Metrics**: CPU, memória, storage
- **SQL Activity**: Queries lentas
- **Databases**: Tamanho das tabelas

---

## 🚀 Deploy

Após configurar, faça deploy:

```bash
# Build
bun run build

# Deploy (se usar Cloudflare/Alchemy)
cd apps/web && bun run deploy
```

---

## 💰 Custos

| Recurso | Free Tier | Se exceder |
|---------|-----------|------------|
| Storage | 5GB | $0.50/GB/mês |
| Request Units | 250M/mês | $0.20/million |
| Data Transfer | 50GB/mês | $0.01/GB |

Para o BSEBET, o free tier deve durar muito tempo!
