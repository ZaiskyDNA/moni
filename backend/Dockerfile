# syntax=docker/dockerfile:1

# Samakan dengan backend/.nvmrc
ARG NODE_VERSION=24

# ---- base ----
FROM node:${NODE_VERSION}-alpine AS base
# Folder dimiliki user `node` supaya container tidak perlu jalan sebagai root.
RUN mkdir -p /app && chown node:node /app
WORKDIR /app
USER node

# ---- dev: dipakai docker compose untuk development (hot reload) ----
FROM base AS dev
ENV NODE_ENV=development
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci
COPY --chown=node:node . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- prod-deps: hanya dependency produksi ----
FROM base AS prod-deps
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- production: image kecil yang nanti di-deploy ke Azure ----
FROM base AS production
ENV NODE_ENV=production
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT:-3000}/api/v1/health" || exit 1
CMD ["node", "src/server.js"]
