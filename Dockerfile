# Dockerfile para Heroku - Bun com suporte a workspace
FROM oven/bun:1.2.2-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copiar arquivos de configuração do workspace primeiro
COPY package.json .
COPY pnpm-workspace.yaml .
COPY turbo.json .
COPY bun.lock* .

# Copiar packages
COPY packages/ ./packages/

# Copiar apps
COPY apps/ ./apps/

# Instalar dependências
RUN bun install

# Build
RUN bun run build

# Porta
EXPOSE 3000

# Comando para iniciar
WORKDIR /app/apps/web
CMD ["bun", "run", "start"]
