# Mapa de documentación

Para evitar que propuestas históricas se confundan con el comportamiento vigente:

1. `PLAN-V2.md` es la fuente de verdad funcional y económica.
2. `GUIA-FACILITADOR.md` describe la operación real del MVP.
3. `MATERIALES-IMPRIMIBLES.md` contiene las hojas listas para el aula.
4. `src/lib/v2/constants.ts`, `src/lib/v2/engine.ts` y `supabase/schema.sql` son la
   fuente de verdad ejecutable.
5. `docs/design/01` a `08` son investigaciones, alternativas y críticas previas.
   Conservan contradicciones de la etapa de diseño de forma intencional; no deben
   usarse como manual de operación ni como contrato de la API.

Si cambia una regla económica, actualiza el plan y los materiales, ejecuta
`npm run calibrate`, corre las pruebas y valida el recorrido con `npm run smoke`.
