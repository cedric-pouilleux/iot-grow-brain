# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Installation de toutes les dépendances (y compris devDependencies pour TypeScript)
# Utilisation de --legacy-peer-deps pour résoudre le conflit entre fastify@5 et fastify-socket.io@5.1.0
RUN npm install --legacy-peer-deps

# Copie du code source et compilation TypeScript
COPY . .
RUN npm run build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Copie des fichiers package pour l'installation des dépendances de production
COPY --from=builder /app/package*.json ./

# Installation des dépendances de production uniquement
# Utilisation de --legacy-peer-deps pour résoudre le conflit entre fastify@5 et fastify-socket.io@5.1.0
RUN npm ci --production --legacy-peer-deps

# Copie du code compilé
COPY --from=builder /app/dist ./dist

# Sécurité: Utilisation de l'utilisateur par défaut 'node'
USER node

EXPOSE 3001

CMD ["node", "dist/server.js"]
