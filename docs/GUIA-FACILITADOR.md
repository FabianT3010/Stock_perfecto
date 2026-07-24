# Guía del facilitador — La Tiendita de Doña Peta

Guion operativo para una sesión de cinco semanas. Los valores económicos están
calibrados con `npm run calibrate`.

## Antes del evento

Un día antes:

- Ejecuta una sesión completa en el aula real con dos o tres celulares.
- Verifica proyector, portal cautivo, bloqueo/desbloqueo y reconexión.
- Si Supabase estuvo inactivo, abre la app para despertar el proyecto.
- Prepara un hotspot, una regleta y dos cargadores.
- Imprime los [materiales de respaldo](./MATERIALES-IMPRIMIBLES.md).

Quince minutos antes:

1. Entra a **Facilitador → Crear sala**.
2. Define el máximo de equipos, los minutos predeterminados por semana y guarda
   el código de sala y el PIN.
3. Abre `/proyector/CODIGO` y comparte el enlace o código de ingreso.
4. Un representante por mesa crea el equipo y anota su código privado de
   recuperación.
5. Revisa la lista, elimina nombres impropios y cierra las inscripciones.

La pantalla **Recuperación** es un respaldo privado para el facilitador. No la
proyectes: contiene las credenciales de todos los equipos.

## Parámetros económicos

**Caja inicial:** Bs 800 por equipo.

**Costo fijo:** Bs 60 por semana.

**Almacenaje:** Bs 0,20 por unidad al cierre.

**Merma:** un producto vencido vale cero.

**Valor final del estante:** 50 % de su costo.

| Producto | Venta | Vence | Estante inicial | Activo desde |
|---|---:|---:|---:|---:|
| Refresco 2L | Bs 15,00 | no | 20 | semana 1 |
| Pan de batalla | Bs 0,80 | 1 semana | 60 | semana 1 |
| Leche PIL 1L | Bs 7,50 | 2 semanas | 12 | semana 1 |
| Snack surtido | Bs 2,50 | no | 40 | semana 1 |
| Maple de huevos | Bs 36,00 | 3 semanas | 2 | semana 2 |
| Detergente 400 g | Bs 11,00 | no | 4 | semana 2 |

El pan y la leche heredados vencen al cerrar la semana 1.

| Producto | La Principal | Caja | Don Lucho |
|---|---:|---:|---:|
| Refresco | 10,50 | ×6 | 13,00 |
| Pan | 0,50 | ×10 | 0,65 |
| Leche | 5,60 | ×6 | 7,80 |
| Snacks | 1,50 | ×24 | 2,00 |
| Maple de huevos | 27,00 | ×3 | 34,00 |
| Detergente | 8,00 | ×12 | 10,50 |

- **La Principal:** más barata, entrega la semana siguiente y vende por cajas.
- **Don Lucho:** entrega hoy, vende suelto y es más caro. Tope normal de 40
  unidades por producto; en la semana 4, 25.

El ranking muestra:

```text
Valor de la Tienda =
  caja + 50 % del inventario vigente al costo
  + Bs 5 × servicio promedio en puntos porcentuales − deuda
```

## Ritmo de cada semana

1. Haz el debrief de la semana anterior y presenta el evento nuevo.
2. Revisa la duración de esa semana y pulsa **Abrir**. El valor recomendado es
   6:00, pero puede configurarse.
3. Observa `enviaron X/Y`. Un pedido de cero también cuenta como enviado.
4. Si necesitas ajustar el ritmo, escribe un nuevo tiempo restante y guárdalo.
   Puedes hacerlo todas las veces necesarias mientras la semana siga abierta.
5. Al llegar a cero, la pestaña del facilitador cierra la semana
   automáticamente. También puedes pulsar **Cerrar ahora**.
6. Pulsa **Revelar** y espera a que aparezca el resultado.
7. Conduce el debrief antes de abrir la siguiente semana.

Mantén abierta la pestaña del facilitador: el autocierre se activa desde ella. No
dejes una semana abierta indefinidamente para esperar a una mesa.

## Guion semana por semana

| Semana | Situación | Pregunta de debrief | Concepto |
|---|---|---|---|
| 1 — Primera semana | La Principal ya pasó; solo están la herencia y Lucho. Pan y leche heredados vencen. | ¿Qué dato usaron para estimar? | Pronóstico |
| 2 — Llega el camión | Hace calor y aparece el afiche de la kermesse de la próxima semana. | ¿Qué pedido debe hacerse hoy para vender mañana? | Lead time |
| 3 — Kermesse | Suben refresco, snacks y pan. Anticipar barato compite contra rescatar caro. | ¿Cuánto costó reaccionar tarde? | Quiebre y servicio |
| 4 — El camión se plantó | Llega solo la mitad de La Principal; se reembolsa el resto. Lucho tiene tope 25. | ¿Qué reserva absorbió el fallo? | Stock de seguridad |
| 5 — Vuelve Doña Peta | Última compra; La Principal ya no llegaría y el sobrante vale la mitad. | ¿Cuándo deja de convenir reponer? | Fin de horizonte |

En la semana 3 compara en el proyector un equipo que anticipó con otro que tuvo
que comprar caro: ambos vieron el mismo afiche.

## Cierre

Pregunta:

- ¿Quién compró de más y cuánto le costaron la merma y el almacenaje?
- ¿Quién se quedó corto durante la kermesse?
- ¿Comprar exactamente el promedio habría sido siempre correcto?
- ¿Qué información habría cambiado su decisión?

Conclusión: decidir bien no es adivinar una cifra exacta; es usar datos para
equilibrar caja, riesgo, inventario y nivel de servicio.

## Contingencias

- **El equipo recarga:** el token guardado permite reconectar automáticamente.
- **Cambia de celular:** elige **Recuperar** e introduce el código privado que
  recibió al registrarse.
- **La red falla mientras arma el carrito:** el borrador queda en ese dispositivo
  para esa ronda, pero no está enviado hasta que aparezca la confirmación. Al
  recuperar conexión, debe pulsar **Enviar pedido** nuevamente.
- **Un celular muere:** el equipo puede entrar desde otro dispositivo con su
  código de recuperación y rehacer el pedido. El panel no tiene carga manual.
- **Una mesa no envía R1:** al revelar se aplica un piloto conservador automático
  con Don Lucho. Desde R2, no enviar significa pedido cero.
- **La app muestra reconexión:** espera unos segundos; al volver a la pestaña
  también se fuerza una recarga.
- **Se pierde el PIN:** introdúcelo de nuevo si lo conservas. No es visible ni
  recuperable desde las pantallas públicas.
- **La red cae más de diez minutos:** continúa una semana en papel con la hoja de
  respaldo. No prometas cargar ese pedido después en el panel: registra el
  resultado manualmente fuera de la app o reinicia esa sesión de práctica.
