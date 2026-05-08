# syntax=docker/dockerfile:1.6
# Multi-stage build для Next.js 15 (output:standalone).
# Финальный образ < 200MB (alpine + только runtime артефакты).

# ─── Stage 1: deps ─────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# libc6-compat нужен некоторым native deps на alpine
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./
# npm install (а не ci) — package-lock иногда отстаёт из-за peer-deps next 15 + react 19.
# Layer cache работает пока package.json не меняется (и тогда этот RUN cached).
# При изменении package.json — BuildKit cache mount /root/.npm даёт переиспользование
# скачанных tarball'ов (npm install с warm cache ~10s вместо ~60s).
RUN --mount=type=cache,id=wfm-admin-npm,target=/root/.npm npm install --no-audit --no-fund

# ─── Stage 2: build ────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Cache mount для .next/cache — Next.js хранит там incremental compile artifacts
# (модулям SWC, кэш React Compiler, и т.п.). Между билдами на одном host'е этот
# кэш переиспользуется → next build на повторных деплоях быстрее на 30-50%.
RUN --mount=type=cache,id=wfm-admin-next-cache,target=/app/.next/cache npm run build

# ─── Stage 3: runtime ──────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Standalone output даёт только то что нужно.
# /public опционально — копируем только если он есть (в этом проекте пока нет)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
