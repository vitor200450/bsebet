# Dockerfile para Heroku - Bun Workspace
FROM oven/bun:1.2.2-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copiar arquivos de configuração do workspace primeiro
COPY package.json .
COPY pnpm-workspace.yaml .
COPY turbo.json .
COPY bun.lock .

# Copiar packages primeiro (para cache de layer)
COPY packages/ packages/

# Copiar apps
COPY apps/ apps/

# Instalar dependências do workspace
RUN bun install --frozen-lockfile || bun install

# Build do app web
RUN bun run build --filter=web

# Porta
EXPOSE 3000

# Comando para iniciar
WORKDIR /app/apps/web
CMD ["bun", "run", "start"]
