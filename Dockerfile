# Dockerfile para Heroku - Usando Node + pnpm
FROM node:22-slim

# Instalar pnpm
RUN npm install -g pnpm

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copiar arquivos de configuração primeiro
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./

# Copiar packages
COPY packages/ ./packages/

# Copiar apps
COPY apps/ ./apps/

# Instalar dependências
RUN pnpm install --frozen-lockfile || pnpm install

# Build
RUN pnpm run build

# Porta
EXPOSE 3000

# Comando para iniciar
WORKDIR /app/apps/web
CMD ["pnpm", "run", "start"]
