# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Cache npm optimisé
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# On ne copie que le dossier de sortie optimisé
COPY --from=builder /app/.output /app/.output

ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

# Sécurité
USER node

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
