# Guía de despliegue — Supabase + Vercel

Todo lo necesario para dejar **Stock Perfecto** en línea, con capa gratuita, listo
para ~45 estudiantes en dos laboratorios. Tiempo estimado: ~15 minutos.

---

## 1. Crear el proyecto Supabase

1. Entra a <https://supabase.com> → **New project**.
2. Elige nombre, contraseña de base de datos y **región cercana** (para menor
   latencia en el evento). Plan **Free**.
3. Espera a que termine de aprovisionar (~2 min).

## 2. Cargar el esquema

1. En el proyecto, abre **SQL Editor** → **New query**.
2. Copia y pega **todo** el contenido de [`supabase/schema.sql`](./supabase/schema.sql).
3. Ejecuta (**Run**). Debe terminar sin errores.
   - Verás algún `NOTICE ... skipping` de los `drop policy if exists`: es normal.
   - Esto crea las tablas, RLS, *grants* y activa **Realtime** en las tablas
     públicas.

> El esquema es idempotente: puedes volver a ejecutarlo sin romper nada.

## 3. Copiar las llaves de API

En **Project Settings → API** copia:

| Valor                     | Variable de entorno              | ¿Secreta? |
| ------------------------- | -------------------------------- | --------- |
| Project URL               | `NEXT_PUBLIC_SUPABASE_URL`       | No        |
| `anon` `public` API key   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | No        |
| `service_role` `secret`   | `SUPABASE_SERVICE_ROLE_KEY`      | **Sí** |

> La `service_role` es **secreta**: nunca la pongas en variables `NEXT_PUBLIC_` ni
> la subas al repositorio. Solo se usa en el servidor.

## 4. Subir el código a GitHub

```bash
git add .
git commit -m "Stock Perfecto"
git branch -M main
git remote add origin https://github.com/<tu-usuario>/<repo>.git
git push -u origin main
```

## 5. Desplegar en Vercel

1. Entra a <https://vercel.com> → **Add New… → Project** → importa tu repo.
2. Framework: **Next.js** (autodetectado). No cambies el build.
3. En **Environment Variables**, agrega las tres del paso 3:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. **Deploy**. En ~1–2 min tendrás una URL pública (ej. `https://tu-app.vercel.app`).

## 6. Probar

1. Abre la URL → **Soy facilitador** → crea una sala. Anota el **código** y el **PIN**.
2. En otra pestaña (o teléfono) → **Soy participante** → entra con el código.
3. Desde el panel del facilitador: **Abrir** ronda 1 → envía una decisión como
   participante → **Cerrar** → **Revelar**. Verifica que el resultado y el ranking
   aparecen al instante.

---

## El día del evento

- Comparte **la URL + el código de sala** (o el enlace `…/join?code=CÓDIGO`).
  Un código QR al enlace facilita el ingreso.
- Antes de empezar, en el panel revisa/edita la **demanda real de cada ronda**
  (columna secreta) y la **demanda histórica** de las rondas 3 y 4.
- Ranking por laboratorio: crea **una sala por laboratorio** y consolida al final,
  o usa **una sola sala** para un ranking global (Supabase Free aguanta 45+ usuarios
  concurrentes sin problema).

## Solución de problemas

- **"Faltan NEXT_PUBLIC_SUPABASE_URL…"**: falta una variable de entorno en Vercel;
  agrégala y vuelve a desplegar (*Redeploy*).
- **El ranking no se actualiza solo**: confirma que el paso 2 corrió completo
  (activa Realtime). En Supabase → **Database → Publications → `supabase_realtime`**
  deben figurar `sessions`, `rounds`, `participants`, `results`.
- **"permission denied for table …"**: no se aplicaron los *grants*; vuelve a
  ejecutar `supabase/schema.sql` completo.
- **Cambiar el esquema después**: edita `supabase/schema.sql`, y vuelve a
  ejecutarlo en el SQL Editor (es idempotente).
