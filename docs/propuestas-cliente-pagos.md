# Plan de pagos Servido — Decisión y alcance

Documento de trabajo alineado al PDF  
**Plan de profesionalización del ecosistema de pagos** (`Plan_Profesionalizacion_Pagos_Servido.pdf`).  
Última actualización: 2026-07-20

---

## Decisión (cerrada)

Se implementa **únicamente** lo del PDF (opción elegida):

1. **Suscripciones recurrentes** — cobro mensual automático con Mercado Pago  
2. **Checkout por vendedor** — el carrito puede ser mixto; al pagar se hace un pago independiente por cada vendedor  
3. **Comisión automática 8%** — Servido retiene el 8%; el vendedor recibe el 92% en su propia cuenta de Mercado Pago  

**Estado de implementación**

| Fase | Estado |
|------|--------|
| 1 Suscripciones recurrentes | **Hecha en código** (PreApproval MP) |
| 2 Checkout por vendedor | **Hecha en código** (1 pago por seller + sesión multi) |
| 3 Comisión 8% | **Hecha en código** (`marketplace_fee` automático) |

**Fuera de alcance por el momento (no se construye en esta etapa):**

- Custodia de pagos / plata en garantía hasta la entrega  
- Billetera interna  
- Liberar pago al vendedor recién cuando el producto llega  
- Pago al cadete por la app  
- Comisión / fee sobre envíos de comida  

Esas ideas quedan documentadas al final solo como archivo histórico / posible etapa futura.

---

## Modelo elegido (resumen para el equipo)

| Pilar | Qué pasa |
|-------|----------|
| Quién cobra la venta | Cada **vendedor**, en su **Mercado Pago** conectado |
| Qué gana Servido | **Suscripción mensual** + **8% automático** por venta |
| Quién paga la comisión | Sale del vendedor (el comprador ve el mismo precio publicado) |
| Multi-vendedor | Varios pagos seguidos (uno por vendedor); si uno falla, los ya aprobados siguen válidos |
| Liquidaciones manuales | **No** hacen falta para la comisión: la reparte Mercado Pago |

No es custodia: la plata **no** queda retenida en Servido hasta la entrega.

---

## Estado actual → objetivo

| Dimensión | Hoy | Objetivo (PDF) |
|-----------|-----|----------------|
| Suscripciones | Pago único ~30 días, renovación manual | Débito mensual automático + vigencia + fallas |
| Carrito multi-vendedor | Un cobro mezcla / complica | Mismo carrito; checkout = 1 pago por vendedor |
| Comisión | % no en uso operativo | 8% automático a Servido, 92% al vendedor |
| Operación | Más manual / confusa | Estados por vendedor; menos liquidación a mano |

---

## Alcance de esta etapa (solo esto)

### 1. Suscripciones recurrentes

- Alta con una adhesión inicial  
- Renovación automática cada mes  
- Estados: aprobado / pendiente / fallido  
- Avisos y reglas de suspensión o baja si no paga  
- Reactivación cuando regulariza  

**Qué hay que modificar (por arriba)**  
- Dejar de tratar la suscripción como “pago único cada 30 días”  
- El comercio se suscribe una vez y se renueva solo  
- Pantallas/avisos si el cobro del mes falla  
- Reglas claras: qué se suspende si no paga  
- Esfuerzo: **alto** (cambio de producto + reglas de negocio)

### 2. Checkout por vendedor

- El comprador sigue armando un carrito mixto  
- Al pagar, Servido agrupa por vendedor y genera N pagos  
- Aviso claro: “Tu compra tiene 2 vendedores. Vas a realizar 2 pagos”  
- Estados independientes: pagado / pendiente / fallido por vendedor  

**Qué hay que modificar (por arriba)**  
- Flujo de checkout en pasos (uno por vendedor)  
- Resumen de qué quedó pago y qué falta  
- Cada cobro va a la cuenta MP de ese vendedor  
- Esfuerzo: **alto**

### 3. Comisión automática 8%

- Comprador paga el total publicado (sin recargo visible de comisión)  
- MP descuenta el 8% a favor de Servido (`marketplace_fee`)  
- Vendedor recibe 92% en su MP  
- Registro claro de importes por parte  

**Qué hay que modificar (por arriba)**  
- Activar de verdad el fee/comisión en el cobro (no texto viejo)  
- Comunicar a vendedores: pasan de ~100% a 92%  
- Depende del checkout por vendedor (Fase 2 antes que Fase 3)  
- Validar con Mercado Pago que el esquema de comisión de plataforma esté disponible en la cuenta  
- Esfuerzo: **medio/alto** (y dependencia de Fase 2 + MP)

**Estado:** implementado en código (julio 2026). Requiere que la app MP esté configurada como marketplace/OAuth para que `marketplace_fee` funcione en producción.

---

## Hoja de ruta (igual que el PDF)

| Fase | Iniciativa | Resultado | Dependencia |
|------|------------|-----------|-------------|
| **1** | Suscripciones recurrentes | Cobro mensual auto + alta/suspensión/baja | Independiente |
| **2** | Checkout por vendedor | Pagos independientes por vendedor | Prepara la comisión |
| **3** | Comisión automática 8% | 8% Servido / 92% vendedor | Requiere Fase 2 |

### Criterios de éxito

- [ ] El comercio se suscribe una vez y renueva sin hacerlo a mano  
- [ ] Un carrito multi-vendedor se completa con pagos separados  
- [ ] Cada vendedor recibe el neto en su MP  
- [ ] Servido recibe el 8% en automático  
- [ ] El comprador ve claro el estado de cada pago  

---

## Experiencia (PDF)

**Comprador**  
- Sigue agregando de varios vendedores  
- Aviso de N pagos  
- Completa pagos en secuencia  
- Ve qué pagó y qué falta  
- El precio no sube por la comisión  

**Vendedor / comercio**  
- Cobra en su MP  
- Recibe el 92%  
- Suscripción se renueva sola  
- Menos procesos manuales  

---

## Fuera de alcance (aparcado — no implementar ahora)

| Tema | Estado |
|------|--------|
| Custodia / plata en garantía hasta entrega | Fuera de alcance |
| Billetera interna | Fuera de alcance |
| Liberar al vendedor al marcar entregado | Fuera de alcance |
| Pago de cadete por la app | Fuera de alcance |
| Fee sobre envío / comisión comida (salvo lo que diga el PDF) | Fuera de alcance |

Si más adelante se retoman, partir de las notas históricas abajo o de una nueva propuesta.

---

## Notas históricas (solo referencia — no son el plan activo)

Antes se exploraron custodia, billetera, cadete y liberación por entrega.  
**Decisión 2026-07-20:** no forman parte de lo que se va a hacer. El plan activo es solo el PDF.

Detalle viejo de opciones (custodia, cadete, etc.) se puede recuperar del historial de git de este archivo si hace falta.

---

## Historial

| Fecha | Qué |
|-------|-----|
| 2026-07-17 | Borrador de opciones (custodia, cadete, comisiones, glosario) |
| 2026-07-20 | **Decisión:** solo el PDF (suscripción recurrente + checkout por vendedor + 8% auto). Custodia/cadete/billetera → fuera de alcance |
| 2026-07-20 | Fase 1 en código: PreApproval recurrente, webhook preapproval/authorized_payment, auth en create, UI renovación automática |
| 2026-07-20 | Fase 2 en código: cobro a cuenta MP de cada vendedor, checkout multi-vendedor con N pagos, continuidad en success/failure/pending |
| 2026-07-20 | Fase 3 en código: `marketplace_fee` 8% a Servido / 92% al vendedor; textos UI actualizados |
