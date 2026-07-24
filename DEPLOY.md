# Despliegue — Supabase + Vercel

Esta guía instala Stock Perfecto v2 desde cero. Antes del evento, haz un ensayo
completo con la misma red y los mismos dispositivos que se usarán en el aula.

## 1. Crear Supabase

1. Crea un proyecto en [Supabase](https://supabase.com/) y elige una región
   cercana al aula.
2. Abre **SQL Editor → New query**.
3. Ejecuta todo `supabase/schema.sql`.
4. Confirma en **Database → Publications** que `supabase_realtime` incluye
   `sessions`, `rounds`, `teams` y `kpi_snapshots`.

`schema.sql` sirve para una instalación nueva de v2. No se debe presentar como
una migración universal desde versiones anteriores. Para cambiar una base que ya
contiene datos, crea y prueba una migración incremental antes de producción.

## 2. Configurar las variables

En **Project Settings → API** toma estos valores:

| Variable | Valor | Exposición |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clave `anon`/publishable | pública |
| `SUPABASE_SERVICE_ROLE_KEY` | clave `service_role`/secret | solo servidor |

La clave `service_role` nunca debe llevar el prefijo `NEXT_PUBLIC_`, llegar al
navegador ni guardarse en Git.

Para desarrollo local, copia `.env.local.example` a `.env.local` y completa los
valores. Para Vercel, agrega las tres variables en la configuración del proyecto.

## 3. Validar antes de publicar

```bash
npm ci
npm run check
```

El comando valida lint, las pruebas del motor, la calibración y el build de
producción.

Para validar también la integración local:

```bash
npx supabase start
npm run dev
# en otra terminal
npm run smoke
```

La prueba de humo modifica únicamente la base a la que apuntan las variables
locales; no la ejecutes contra producción.

## 4. Desplegar en Vercel

1. Sube el repositorio a un origen Git.
2. En Vercel selecciona **Add New → Project** e importa el repositorio.
3. Mantén el framework Next.js y los comandos detectados.
4. Agrega las tres variables del apartado 2 a los ambientes correspondientes.
5. Despliega.

## 5. Prueba posterior al despliegue

1. Crea una sala de dos equipos.
2. Desde otro navegador registra dos equipos con nombres distintos.
3. Verifica que cada alta entregue un código privado de recuperación y que un
   nombre duplicado sea rechazado.
4. Cierra las inscripciones, comprueba que no se pueda crear otro equipo y
   vuelve a abrirlas antes de iniciar.
5. Configura R1 con una duración distinta, ábrela y vuelve a cambiar el tiempo
   restante mientras está activa.
6. Envía una compra de cero y verifica que el panel muestre `1/2`.
7. Cierra, revela y comprueba que el equipo vea caja, inventario y resultado.
8. Intenta revelar otra vez: la ronda debe permanecer sin duplicados.

## Preparación del evento

- Crea la sala, define el cupo y proyecta la URL con el código.
- Cada mesa registra un equipo y guarda su código privado de recuperación.
- Revisa nombres, elimina registros impropios y cierra las inscripciones antes
  del briefing. Abrir R1 también las bloquea.
- Abre `/proyector/CODIGO` en la pantalla del aula.
- Conserva el navegador del facilitador abierto: el autocierre lo dispara esa
  pestaña cuando el reloj llega a cero; no existe un cron externo.
- Despierta el proyecto Supabase el día anterior si el plan puede pausarlo por
  inactividad.
- Lleva hotspot, regleta y copias de
  `docs/MATERIALES-IMPRIMIBLES.md` como respaldo.

## Diagnóstico

- **Faltan variables Supabase:** revisa los tres nombres exactos y vuelve a
  desplegar.
- **El facilitador pierde acceso:** vuelve a introducir el código y el PIN. El
  PIN no puede recuperarse desde las vistas públicas.
- **El ranking no se refresca:** comprueba la publicación Realtime y la conexión
  del navegador; el cliente también sondea y recarga al recuperar visibilidad.
- **Permission denied:** el esquema o sus grants no se aplicaron completos.
- **Un equipo no pudo enviar R1:** al revelar, el servidor genera una compra
  conservadora a Don Lucho. En R2–R5, no enviar equivale a pedido cero y se vende
  solo el inventario disponible.
- **Cambio de esquema con datos existentes:** usa una migración incremental y un
  respaldo; no vuelvas a pegar `schema.sql` a ciegas.
