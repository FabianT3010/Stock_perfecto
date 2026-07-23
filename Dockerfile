# syntax=docker/dockerfile:1
# ---- Imagen de producción de la app Next.js (output standalone) ----

# 1) Dependencias
# Nota: se usa `npm install` (no `npm ci`) porque el package-lock.json puede
# generarse en Windows y omitir dependencias opcionales específicas de Linux
# (p. ej. @emnapi/*), lo que haría fallar el check estricto de `npm ci`.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

# 2) Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Las variables NEXT_PUBLIC_* se "hornean" en el bundle del navegador en build.
# Se pasan como build args (son públicas: URL y anon key).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# 3) Runtime mínimo
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuario sin privilegios
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# SUPABASE_SERVICE_ROLE_KEY (y opcional SUPABASE_URL) se pasan en tiempo de
# ejecución (docker run -e / compose environment), NO en build.
CMD ["node", "server.js"]
