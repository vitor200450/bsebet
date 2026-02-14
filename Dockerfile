# Dockerfile para Heroku
FROM oven/bun:1.2.2-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copiar TODOS os arquivos primeiro
COPY . .

# Instalar dependências (sem frozen-lockfile pois o Heroku modifica o lockfile)
RUN bun install

# Build
RUN bun run build

# Porta
EXPOSE 3000

# Comando para iniciar
WORKDIR /app/apps/web
CMD ["bun", "run", "start"]
