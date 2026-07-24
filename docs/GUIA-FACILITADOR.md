# Guía del facilitador — La Tiendita de Doña Peta

Todo lo necesario para correr la actividad el día del evento. Los números de esta
guía son los **calibrados** (validados con `tools/calibrate.mjs`).

---

## 1. Antes del evento

### Un día antes (D-1)
- [ ] **Despertar la base de datos** (Supabase pausa proyectos inactivos): abre la app y crea una sala de prueba.
- [ ] **Ensayo** de una sesión completa en el aula real, con 2-3 celulares.
- [ ] **Wifi B**: ten a mano el *hotspot* 4G del facilitador por si el wifi del aula falla.
- [ ] Regleta + 2 cargadores.

### Montaje (15 min antes)
1. Entra a la app → **Facilitador → Crear sala**.
2. Escribe los **nombres de los equipos** (uno por línea) → *Crear sala*.
3. Anota el **código** y el **PIN de 6 dígitos**.
4. Imprime los **carteles** (botón *Carteles* en el panel, o `…/facilitator/CÓDIGO/carteles`) y ponlos en cada mesa.
5. Abre la **proyección** (`…/proyector/CÓDIGO`) en la pantalla del aula.

---

## 2. Reparto de la tienda (números)

**Caja inicial:** Bs 800 por equipo · **Costo fijo:** Bs 60/semana · **Almacenaje:** Bs 0,20 por unidad que queda en estante.
**Merma:** una unidad vencida vale 0 (se pierde el costo pagado). **Cierre (R5):** el estante vale el 50 % de su costo.

**Catálogo (6 productos):**

| Producto | Precio venta | Vence | Estante inicial | Entra |
|---|---|---|---|---|
| Refresco 2L | Bs 15,00 | no | 20 | Sem 1 |
| Pan de batalla | Bs 0,80 | **1 semana** | 60 (vence sem 1) | Sem 1 |
| Leche PIL 1L | Bs 7,50 | 2 semanas | 12 (vence sem 1) | Sem 1 |
| Snack surtido | Bs 2,50 | no | 40 | Sem 1 |
| Maple de huevos | Bs 36,00 | 3 semanas | 2 | **Sem 2** |
| Detergente 400 g | Bs 11,00 | no | 4 | **Sem 2** |

**Proveedores:**
- **La Principal (el camión):** barato, entrega **la próxima semana**, se compra **por cajas**. Atiende de la semana 2 a la 4 (en la 1 "ya pasó" y en la 5 "ya no llegaría").
- **Don Lucho (el rival):** caro, entrega **hoy**, suelto. **Tope 40 por producto** (y solo **25 en la semana 4**).

**Costos por unidad (La Principal / Don Lucho) y caja de La Principal:**

| Producto | La Principal | caja | Don Lucho |
|---|---|---|---|
| Refresco | 10,50 | ×6 | 13,00 |
| Pan | 0,50 | ×10 | 0,65 |
| Leche | 5,60 | ×6 | 7,80 |
| Snack | 1,50 | ×24 | 2,00 |
| Maple huevos | 27,00 | ×3 | 34,00 |
| Detergente | 8,00 | ×12 | 10,50 |

**Puntaje — Valor de la Tienda** (visible siempre): `Caja + estante al 50 % del costo + Bs 5 por cada punto de % de servicio promedio − Deuda`.

---

## 3. Guion semana por semana

En cada semana: **Abrir** (los equipos piden) → **Cerrar** (ya no se cambia) → **Revelar** (se calculan ventas, mermas y caja). El evento de cada semana aparece solo en la app y el proyector.

| Semana | Qué pasa | El "aha" | Concepto a nombrar (después de vivirlo) |
|---|---|---|---|
| **1 — La primera semana** | Semana normal. El camión aún no atiende: se sobrevive con la herencia + compras chicas a Don Lucho. Ojo: el **pan y la leche heredados vencen esta semana**. | "Adivinar y calcular no es lo mismo." | **Pronóstico** (promedio del cuaderno). |
| **2 — Llega el camión** | Hace calor. Aparece el **afiche: kermesse la próxima semana**. Ahora sí atiende La Principal: lo que pidan hoy **llega justo para la kermesse**. | "Lo que decido hoy es el inventario de la próxima semana." | **Lead time**. |
| **3 — La kermesse** | Vuela el refresco, los snacks y el pan. Quien anticipó en la 2 cubre barato; quien no, rescata caro con Lucho (capado). | "La información de hoy valía plata." | **Quiebre / nivel de servicio**. |
| **4 — El camión se plantó** | Llega **solo la mitad** de lo pedido a La Principal (te devuelven la plata del resto). A Don Lucho le queda poco: **tope 25**. | "Tener reserva salva; ir justo, no." | **Colchón (stock de seguridad)**. |
| **5 — Vuelve Doña Peta** | Última compra. La Principal **ya no atiende**. El estante que sobre vale la mitad. | "No existe la decisión perfecta: existe el equilibrio." | **Fin de horizonte**. |

**Compara en el proyector** (semana 3) al equipo que anticipó vs. al que le compró caro a Lucho: *"los dos vieron el MISMO afiche"*.

---

## 4. Cierre (debrief)

Con el ranking final en pantalla, pregunta:
- ¿Quién compró de más y qué le pasó con la merma y el almacenaje?
- ¿Quién se quedó corto en la kermesse? ¿Cuánta plata se fue en clientes no atendidos?
- ¿La mejor decisión fue comprar el promedio?
- ¿Qué dato les hubiera ayudado antes?

**La conclusión:** una buena decisión no consiste en adivinar la demanda exacta, sino en **usar datos para equilibrar ganancia, riesgo, inventario y ventas perdidas**.

---

## 5. Si algo falla

- **Un celular se murió / se quedó sin señal:** el equipo te **dicta el pedido** y tú lo cargas desde tu panel (o lo re-hace al reconectar; su carrito queda guardado en el celular).
- **La app dice "reconectando":** es normal si el celular se bloqueó; al volver a la pantalla se actualiza solo.
- **Un equipo duplicado / de broma:** en el panel, botón **quitar** junto al equipo.
- **Olvidaste el PIN:** el navegador del facilitador lo recuerda; si no, crea otra sala (los equipos vuelven a entrar con el nuevo código).
- **Wifi caído más de 10 min:** juega **una semana en papel** con la tabla de costos de §2 y carga los resultados después.

> Regla de oro: **deja la semana abierta hasta que el semáforo muestre que todos enviaron.** El botón *Cerrar* congela los pedidos.
