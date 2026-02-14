# Setup Docker Local (Gratuito Ilimitado)

## Por que Docker?

- **Custo**: $0 - Ilimitado
- **Performance**: Mais rápido que qualquer banco cloud (localhost)
- **Offline**: Funciona sem internet
- **Controle**: Total controle sobre o ambiente

## Instalação

### 1. Instale o Docker Desktop

1. Baixe em: https://www.docker.com/products/docker-desktop
2. Instale e reinicie o computador
3. Verifique se está rodando:
   ```bash
   docker --version
   ```

### 2. Inicie o Banco de Dados

```bash
# Na pasta do projeto (onde está docker-compose.yml)
docker-compose up -d

# Verifique se está rodando:
docker ps

# Saída esperada:
# CONTAINER ID   IMAGE             STATUS          PORTS
# xxx            postgres:15       Up 10 seconds   0.0.0.0:5432->5432/tcp
```

### 3. Configure o .env.local

```bash
# Copie o arquivo de exemplo
copy .env .env.local

# Edite o DATABASE_URL para apontar para o Docker:
DATABASE_URL=postgresql://postgres:devpassword@localhost:5432/bsebet
```

### 4. Aplique as Migrações

```bash
# Push do schema para o banco local
bun run db:push

# Ou use o script específico:
cd packages/db && bun run db:push
```

### 5. Popule com Dados de Teste (Opcional)

```bash
bun run db:seed
```

### 6. Inicie o Servidor de Desenvolvimento

```bash
bun run dev
```

---

## Comandos Úteis

```bash
# Parar o banco
docker-compose down

# Parar e remover dados (cuidado!)
docker-compose down -v

# Ver logs do banco
docker-compose logs -f postgres

# Acessar o banco via CLI
docker exec -it bsebet-dev-db psql -U postgres -d bsebet

# Backup do banco local
docker exec bsebet-dev-db pg_dump -U postgres bsebet > backup-local.sql

# Restore para o banco local
docker exec -i bsebet-dev-db psql -U postgres -d bsebet < backup-local.sql
```

---

## Migração de Produção → Local

Se quiser copiar os dados da produção para o ambiente local:

```bash
# 1. Dump da produção (ajuste a connection string)
pg_dump "postgresql://...produção..." > prod-backup.sql

# 2. Pare o container local
docker-compose down

# 3. Suba novamente (limpo)
docker-compose up -d

# 4. Restore para o banco local
docker exec -i bsebet-dev-db psql -U postgres -d bsebet < prod-backup.sql
```

---

## Troubleshooting

### Erro: "port 5432 is already allocated"

```bash
# Algum outro PostgreSQL está rodando na porta 5432
# Solução 1: Pare o outro serviço
# Solução 2: Mude a porta no docker-compose.yml

# No docker-compose.yml, altere:
ports:
  - "5433:5432"  # Agora usa porta 5433

# E atualize o .env.local:
DATABASE_URL=postgresql://postgres:devpassword@localhost:5433/bsebet
```

### Erro: "connection refused"

```bash
# Verifique se o container está rodando
docker ps

# Se não estiver, veja os logs
docker-compose logs postgres
```

### Dados somem ao reiniciar

Isso é normal se você usou `docker-compose down -v`. Para persistir:

```bash
# Só pare o container, não remova o volume
docker-compose down

# Ou use stop em vez de down
docker-compose stop
```

---

## Alternativa: Sem Docker (Windows)

Se preferir não usar Docker, instale o PostgreSQL nativo:

1. Baixe: https://www.postgresql.org/download/windows/
2. Instale com senha `devpassword`
3. Crie o banco `bsebet`
4. Use a connection string: `postgresql://postgres:devpassword@localhost:5432/bsebet`
