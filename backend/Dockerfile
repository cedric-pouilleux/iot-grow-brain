# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Installation des dépendances (npm ci nécessite un lockfile synchronisé)
# Si npm ci échoue, utiliser npm install en fallback ou s'assurer que package-lock.json est présent
RUN npm install --production

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Copie des node_modules depuis le builder
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Sécurité: Utilisation de l'utilisateur par défaut 'node'
USER node

EXPOSE 3001

CMD ["node", "index.js"]
