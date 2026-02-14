# Dockerfile para Heroku
FROM oven/bun:1.2.2-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copiar arquivos de configuração
COPY package.json bun.lock turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/env/package.json ./packages/env/
COPY packages/auth/package.json ./packages/auth/
COPY packages/api/package.json ./packages/api/
COPY packages/config/package.json ./packages/config/

# Instalar dependências
RUN bun install --frozen-lockfile

# Copiar código fonte
COPY . .

# Build
RUN bun run build

# Porta
EXPOSE 3000

# Comando para iniciar
WORKDIR /app/apps/web
CMD ["bun", "run", "start"]
