# Guia de Deploy do Banco de Dados

## Scripts Disponíveis

### Desenvolvimento (Banco local/dev)
```bash
# Push schema para banco de desenvolvimento
bun run db:push

# Abrir Drizzle Studio no banco de desenvolvimento
bun run db:studio

# Gerar arquivo de migração
bun run db:generate

# Rodar migrações pendentes
bun run db:migrate

# Popular banco com dados de teste
bun run db:seed
```

### Produção (⚠️ Cuidado!)
```bash
# Push schema para produção
bun run db:push:prod

# Abrir Drizzle Studio na produção
bun run db:studio:prod

# Gerar migração baseada na produção
bun run db:generate:prod

# Rodar migrações em produção
bun run db:migrate:prod
```

## Fluxo Recomendado

### 1. Desenvolvimento Local
Configure seu `.env.local` para apontar para um banco de desenvolvimento:
```env
DATABASE_URL=postgresql://... (banco de DEV)
```

### 2. Alterando o Schema
Edite os arquivos em `packages/db/src/schema/` e teste localmente:
```bash
bun run db:push
```

### 3. Deploy para Produção
Quando estiver pronto, faça o deploy:
```bash
# Opção A: Push direto (mais rápido, mas pode perder dados)
bun run db:push:prod

# Opção B: Migração segura (recomendado)
bun run db:generate      # Gera arquivo de migração
bun run db:migrate:prod  # Aplica em produção
```

## ⚠️ Avisos Importantes

1. **NUNCA** rode `bun run db:seed` em produção! Ele limpa todos os dados.

2. **BACKUP** sempre antes de fazer alterações em produção.

3. **`db:push`** pode causar perda de dados se você remover colunas.

4. O arquivo `.env.production` contém credenciais sensíveis e **NUNCA** deve ser commitado.

## Troubleshooting

### Erro de SSL
Se encontrar erros de SSL em produção, verifique se a URL do banco inclui `sslmode=require` ou se o pooler da Supabase está configurado corretamente.

### Conflitos de Migração
Se houver conflitos entre migrações locais e produção:
1. Faça backup do banco de produção
2. Verifique as migrações aplicadas: `bun run db:studio:prod`
3. Resolva manualmente ou recrie as migrações

## 📦 Migração de Dados (Local -> Produção)

Para levar seus dados locais (times, torneios, usuários) para a produção:

### 1. Preparar o Backup Local
Você precisa gerar um arquivo SQL do seu banco local.
Se estiver usando Postgres localmente:
```bash
pg_dump -U postgres -d bsebet --data-only --inserts > db_backup/meus_dados.sql
```
*Certifique-se de criar a pasta `db_backup` na raiz do projeto se não existir.*

### 2. Importar para Produção
O projeto possui um script automatizado para isso:

```bash
bun run db:import:prod
```

Este script irá:
1. Ler os arquivos `.sql` na pasta `db_backup`
2. Conectar ao Heroku (login necessário)
3. Importar os dados com segurança

### 3. Deploy da Aplicação (Código)
Para subir as telas novas:

```bash
bun run deploy
```
*Isso usa o pacote `infra` para realizar o deploy via Alchemy.*

