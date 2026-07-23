# Ejecutar con Docker 🐳

Se containeriza **la app Next.js**. La base de datos (Supabase) es un servicio
aparte: puede ser tu proyecto en la nube o Supabase local (`npx supabase start`).

> La imagen usa el *output standalone* de Next: un servidor Node mínimo (~300 MB).

---

## Variables

| Variable                          | ¿Cuándo?          | ¿Secreta? | Notas                                             |
| --------------------------------- | ----------------- | --------- | ------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | **build** (arg)   | No        | Se hornea en el bundle del navegador.             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | **build** (arg)   | No        | Se hornea en el bundle del navegador.             |
| `SUPABASE_SERVICE_ROLE_KEY`       | **runtime** (env) | **Sí** 🔒 | Solo servidor.                                    |
| `SUPABASE_URL`                    | **runtime** (env) | No        | URL que usa el *servidor*. Vacío ⇒ usa la pública. |
| `APP_PORT`                        | runtime (compose) | No        | Puerto en el host (default 3000).                 |

Las `NEXT_PUBLIC_*` se fijan en el momento del **build** (por eso van como
`--build-arg`). La `SUPABASE_SERVICE_ROLE_KEY` se pasa al **ejecutar**.

`SUPABASE_URL` existe porque el navegador y el contenedor pueden necesitar URLs
distintas (ver [Supabase local](#con-supabase-local)).

---

## Opción A — `docker compose` (recomendada)

```bash
cp .env.docker.example .env      # completa las llaves
docker compose up --build        # -d para segundo plano
```

Abre `http://localhost:${APP_PORT:-3000}`.

Para detener: `docker compose down`.

## Opción B — `docker` a mano

```bash
# Build (llaves públicas como build args)
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="https://TU-PROYECTO.supabase.co" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="TU_ANON_KEY" \
  -t stock-perfecto .

# Run (service role en runtime)
docker run -p 3000:3000 \
  -e SUPABASE_SERVICE_ROLE_KEY="TU_SERVICE_ROLE_KEY" \
  stock-perfecto
```

---

## Con Supabase en la nube

- `NEXT_PUBLIC_SUPABASE_URL` = URL de tu proyecto.
- `SUPABASE_URL` = **vacío** (el servidor usa la misma URL pública).
- Recuerda haber corrido `supabase/schema.sql` (ver [DEPLOY.md](./DEPLOY.md)).

## Con Supabase local

`npx supabase start` corre en tu **host**. Desde dentro del contenedor,
`127.0.0.1` es el propio contenedor, así que el **servidor** debe apuntar al host:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321      # lo usa el navegador (host)
SUPABASE_URL=http://host.docker.internal:54321       # lo usa el contenedor
```

El `docker-compose.yml` ya incluye `host.docker.internal` vía `extra_hosts`.

---

## Notas

- Cambiaste una llave `NEXT_PUBLIC_*` ⇒ hay que **reconstruir** la imagen
  (están horneadas en el build).
- La imagen no incluye la carpeta `supabase/` ni los `.env*` (ver `.dockerignore`).
- Para producción real, lo más simple sigue siendo **Vercel** ([DEPLOY.md](./DEPLOY.md));
  Docker es útil para correr en tu propio servidor o de forma autónoma.
