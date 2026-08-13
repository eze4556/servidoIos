# Servido — Propuesta operativa y técnica

**Delivery, comisiones restaurantes y liquidación de cadetes**

| | |
|---|---|
| **Documento** | Propuesta para cliente |
| **Plataforma** | Servido Marketplace |
| **Fecha** | Agosto 2026 |
| **Versión** | 1.3 — **Tarifas y liquidación definidas** |

---

## 1. Resumen ejecutivo

Servido evoluciona el módulo de **delivery de comida** con tres pilares:

1. **Restaurantes:** de suscripción mensual a **comisión del 12% por pedido** (sin BIN ni PSP propio; vía Mercado Pago).
2. **Cadetes:** pago **por kilómetro recorrido por pedido**, calculado automáticamente entre el local y el cliente.
3. **Liquidación:** **Servido paga a los cadetes cada martes**; los restaurantes no gestionan el pago al repartidor.

**Decisiones de producto confirmadas:**

| Ámbito | Decisión |
|--------|----------|
| **Delivery** | Solo **Mercado Pago** (sin efectivo ni transferencia) |
| **Retiro en local** | **Mercado Pago** o **efectivo en mostrador** |
| **Comisión retiro efectivo** | **Opción B:** comisión acumulada; restaurante liquida a Servido |
| **Tarifa cliente** | **$1.000 ARS / km** |
| **Tarifa cadete** | **$800 ARS / km** |
| **Liquidaciones** | **Todos los martes** (cadetes + comisiones restaurante) |
| **Tracking cadete** | Solo app Capacitor (no web) |

Este documento describe el modelo de negocio, flujos de dinero, experiencia de usuario y plan de implementación por fases.

---

## 2. Situación actual (referencia)

| Aspecto | Hoy en Servido |
|---------|----------------|
| Restaurantes | Suscripción mensual obligatoria para operar |
| Comisión sobre comida | 0% (el pago va 100% al restaurante) |
| Comisión marketplace productos | 8% (solo catálogo general) |
| Envío | Precio fijo configurado por el restaurante |
| Pago al cadete | Manual, fuera de la app; el restaurante paga al cadete |
| Métodos de pago | Mercado Pago, efectivo y transferencia |
| Distancia | No se calcula en pedidos de comida |
| Dirección del cliente | Texto libre, sin coordenadas |
| Tracking cadete | No existe (solo link a Google Maps) |

---

## 3. Modelo propuesto — Restaurantes (12% por pedido)

### 3.1 Cambio de modelo

| Antes | Después |
|-------|---------|
| Suscripción mensual | **12% de comisión por pedido** sobre el subtotal de comida |
| Sin comisión automática en comida | Comisión cobrada vía **Mercado Pago** (`marketplace_fee`) en pedidos MP |
| Restaurante debe suscribirse para aparecer | Restaurantes activos sin gate de suscripción (modelo comisión) |
| Delivery: MP, cash o transfer | **Delivery: solo Mercado Pago** |

### 3.2 Política de métodos de pago

| Tipo de pedido | Mercado Pago | Efectivo | Transferencia |
|----------------|--------------|----------|---------------|
| **Delivery** (envío con cadete) | ✅ Obligatorio | ❌ No | ❌ No |
| **Retiro en local** | ✅ Opcional | ✅ Opcional | ❌ No (MVP) |

**Por qué delivery solo MP:**

- Comisión 12% **automática** en cada pedido.
- Envío entra a Servido → permite **liquidar cadetes** sin cobranza manual.
- Cadete **nunca cobra en la puerta** → operación simple y sin errores.
- Sin deudas ni morosidad del restaurante en envíos.

### 3.3 Flujo de dinero — Delivery con Mercado Pago

```
Cliente paga online:  Subtotal comida + Envío (por km)

Mercado Pago divide:
  → Restaurante:  Subtotal − 12%
  → Servido:      12% del subtotal + 100% del envío
```

**Ejemplo delivery:**

| Concepto | Monto |
|----------|-------|
| Comida (subtotal) | $10.000 |
| Envío (8 km × $1.000/km) | $8.000 |
| **Total cliente** | **$18.000** |
| Comisión Servido (12%) | $1.200 |
| Restaurante recibe | $8.800 |
| Servido recibe | $1.200 + $8.000 = **$9.200** |

De ese $9.200, Servido liquida cadetes **cada martes** y retiene margen de envío + comisión.

### 3.4 Alcance de la comisión

- **Recomendación:** 12% aplicado solo sobre **subtotal de comida**, no sobre el envío.
- El envío se destina al esquema de cadetes (ver sección 4).

### 3.6 Tarifas por km y calendario — **valores definidos**

Parámetros iniciales en producción (`settings/deliveryPricing`):

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| **Tarifa cliente** (`customerRatePerKm`) | **$1.000 ARS / km** | Envío que paga el comprador |
| **Tarifa cadete** (`cadeteRatePerKm`) | **$800 ARS / km** | Lo que gana el repartidor por pedido |
| **Envío mínimo** (`minDeliveryFee`) | **$1.500 ARS** | Mínimo cobrado al cliente |
| **Envío máximo** (`maxDeliveryFee`) | **$15.000 ARS** | Tope de envío al cliente |
| **Pago mínimo cadete** (`minCadetePay`) | **$1.200 ARS** | Mínimo por entrega al cadete |
| **Comisión Servido** | **12%** | Solo sobre subtotal de comida |

**Fórmulas por pedido delivery:**

```
distanceKm       = distancia restaurante → cliente (Haversine × 1,25)
deliveryFee      = max(minDeliveryFee, min(distanceKm × 1.000, maxDeliveryFee))
cadetePayAmount  = max(minCadetePay, distanceKm × 800)
margen Servido   = deliveryFee − cadetePayAmount  (por km: $200 ARS)
```

**Ejemplo 6 km:**

| Concepto | Cálculo | Monto |
|----------|---------|-------|
| Envío cliente | 6 × $1.000 | $6.000 |
| Pago cadete | 6 × $800 | $4.800 |
| Margen Servido en envío | $6.000 − $4.800 | $1.200 |

**Liquidaciones — todos los martes:**

| Liquidación | Quién | Período | Acción |
|-------------|-------|---------|--------|
| **Cadetes** | Servido → cadete | Pedidos entregados martes anterior → lunes | Transferencia + marcar pagado en admin |
| **Comisiones restaurante** | Restaurante → Servido | Retiros en efectivo del período | Restaurante transfiere; admin marca cobrada |

- **Día:** cada **martes**.
- **Corte:** del **martes 00:00** al **lunes 23:59** (hora Argentina).
- **Notificación:** lunes noche / martes mañana con resumen en panel cadete y restaurante.

---

### 3.7 Retiro en local — **Opción B confirmada**

En retiro **no hay cadete ni envío**. Hay dos formas de pago:

| Método retiro | Comisión Servido |
|---------------|------------------|
| **Mercado Pago** | Automática (12% vía MP, igual que delivery) |
| **Efectivo en mostrador** | **Opción B:** acumulada; restaurante paga a Servido periódicamente |

#### Retiro con Mercado Pago

Cliente paga online antes de retirar → comisión 12% automática → sin deuda.

#### Retiro en efectivo (Opción B — **aprobada**)

Servido **no controla el cobro en mostrador**, pero el pedido pasó por la app → se registra la comisión:

| Paso | Qué pasa |
|------|----------|
| 1 | Cliente pide retiro en local con **efectivo** |
| 2 | Pedido confirmado en app (sin MP) |
| 3 | Cliente paga **100% en efectivo** al restaurante en el mostrador |
| 4 | Sistema guarda: `servidoCommission = 12%`, `commissionStatus = pending` |
| 5 | Comisión **acumula** en cuenta del restaurante |
| 6 | **Liquidación periódica:** restaurante transfiere a Servido; admin marca cobrada (**martes**) |

**Ejemplo:**

| Concepto | Monto |
|----------|-------|
| Subtotal comida | $5.000 |
| Cliente paga en mostrador | $5.000 |
| Comisión Servido (12%) | $600 → **pendiente de cobro** |
| Restaurante debe a Servido | $600 (liquidación **martes**) |

**Panel restaurante:**

```
Comisiones pendientes (retiros en efectivo): $4.200
Próxima liquidación: martes 12/08
[Ver detalle por pedido]
```

**Panel admin Servido:**

- Restaurantes con comisión pendiente.
- Botón **Marcar cobrada** (modelo revendedores / cadetes).
- Opcional: bloquear retiro en efectivo si deuda supera umbral.

---

## 4. Modelo propuesto — Cadetes (pago por km)

### 4.1 Principio

Solo en pedidos **delivery con Mercado Pago**:

```
Distancia (km) = restaurante → cliente (calculada al crear el pedido)
Pago cadete     = distancia × $800 ARS/km (mínimo $1.200)
Envío cliente   = distancia × $1.000 ARS/km (mínimo $1.500, máx. $15.000)
```

El monto queda guardado en el pedido. Como el cliente **siempre pagó online**, el cadete **nunca cobra en la puerta**.

### 4.2 Liquidación cadete (simplificada)

```
cadetePayAmount     = distancia × tarifa cadete
servidoPayoutAmount = cadetePayAmount   (siempre 100%, sin restas)
```

No hay modal de efectivo ni `cadeteCashCollected` en delivery.

### 4.3 Cálculo de distancia

| Fase | Método | Notas |
|------|--------|-------|
| MVP | Haversine + factor (~1,25) | Sin costo de APIs |
| Fase 2+ | API de rutas | Distancia por calle |

### 4.4 Tarifas — valores en producción

Ver sección **3.6** para tabla completa. Resumen:

- Cliente: **$1.000/km** · Cadete: **$800/km**
- Admin puede ajustar vía `settings/deliveryPricing` sin cambiar código.

### 4.5 Margen Servido en envío

```
Margen envío = deliveryFee (cliente) − cadetePayAmount (cadete)
```

---

## 5. Liquidación semanal — **martes** — Servido paga a los cadetes

### 5.1 Flujo

1. Pedidos delivery MP → entregados → `cadetePayoutStatus = accrued`.
2. **Cada martes:** job agrupa entregas del período (martes anterior → lunes).
3. Lote `cadetePayoutBatches` → admin transfiere → marca pagado.
4. Cadete con datos bancarios (CBU, alias, titular).
5. Cadete ve en panel: *“Próxima liquidación: martes”*.

### 5.2 Condición MP (delivery)

```
marketplace_fee = 12% del subtotal + deliveryFee completo
```

Servido recibe comisión + envío; paga cadetes desde ese pool.

---

## 6. Tracking del cadete en tiempo real (solo app)

| Plataforma | Tracking |
|------------|----------|
| App Capacitor | Mapa en vivo |
| Web | Solo estados de texto |

- `Geolocation.watchPosition` en app cadete con pedido activo.
- Firestore `liveLocation` en el pedido.
- Detener al `entregado`.

---

## 7. Experiencia por actor

### 7.1 Cliente

| Escenario | Pago |
|-----------|------|
| Delivery | Solo Mercado Pago (comida + envío online) |
| Retiro MP | Paga online, retira en local |
| Retiro efectivo | Pide en app, paga en mostrador (comisión Servido vía restaurante) |

### 7.2 Restaurante

- Delivery: solo pedidos MP entrantes.
- Sin pagar cadetes (Servido liquida).
- Si retiro efectivo (Opción B): panel con **comisiones pendientes** a Servido.
- Mercado Pago conectado obligatorio para delivery.

### 7.3 Cadete

- Solo pedidos **ya pagados online**.
- Badge: *Pagado online — no cobrás en puerta*.
- Al entregar: un botón, sin modal de efectivo.
- Liquidación **martes** del 100% de `cadetePayAmount`.

### 7.4 Admin Servido

- Liquidaciones cadetes (**martes**).
- Liquidaciones comisiones restaurante retiro efectivo (**martes**).
- Config tarifas: $1.000/km cliente, $800/km cadete.
- Reportes comisión + envío.

---

## 8. Campos nuevos en pedidos (`foodOrders`)

| Campo | Descripción |
|-------|-------------|
| `restaurantLat`, `restaurantLng` | Origen |
| `deliveryLat`, `deliveryLng` | Destino (delivery) |
| `distanceKm` | Distancia calculada |
| `deliveryFee` | Envío al cliente (0 en retiro) |
| `cadetePayAmount` | Ganancia cadete |
| `servidoCommission` | 12% subtotal |
| `restaurantNetAmount` | Subtotal neto restaurante |
| `servidoPayoutAmount` | = `cadetePayAmount` en delivery MP |
| `commissionStatus` | `collected` (MP) \| `pending` (retiro cash) \| `paid` |
| `cadetePayoutStatus` | `accrued` \| `batched` \| `paid` |
| `cadetePayoutBatchId` | Lote semanal cadete |
| `liveLocation` | Tracking (opcional) |

*Campos `cadeteCashCollected` eliminados del alcance — no aplican con delivery solo MP.*

---

## 9. Plan de implementación por fases

### Fase 1 — Core negocio (3–4 semanas)

**Objetivo:** comisión 12%, envío por km, delivery solo MP, acumulado cadete.

| # | Entregable |
|---|------------|
| 1.1 | Config tarifas: $1.000/km cliente, $800/km cadete, mínimos y máximos |
| 1.2 | Checkout: coordenadas + preview envío (delivery) |
| 1.3 | Cálculo distancia y montos al crear pedido |
| 1.4 | MP delivery: `marketplace_fee` = 12% + envío |
| 1.5 | **Delivery: forzar MP; ocultar cash/transfer** |
| 1.6 | Campos nuevos en `foodOrders` |
| 1.7 | Quitar gate suscripción restaurante |
| 1.8 | Panel cadete: km, ganancia, badge *Pagado online* |
| 1.9 | Entregar sin modal efectivo |
| 1.10 | Acumulado semanal cadete en panel |
| 1.11 | UI restaurante: sin pagar cadete; comisión visible |

**Retiro en local (Opción B confirmada):**

| # | Entregable |
|---|------------|
| 1.12 | Retiro: MP (automático) + efectivo en checkout |
| 1.13 | Retiro efectivo: `commissionStatus: pending` + acumulado |
| 1.14 | Panel restaurante: comisiones pendientes a Servido |

---

### Fase 2 — Liquidaciones formales (1–2 semanas)

| # | Entregable |
|---|------------|
| 2.1 | Datos bancarios cadete |
| 2.2 | `cadetePayoutBatches` + admin marcar pagado |
| 2.3 | Job agregación **martes** (período martes–lunes) cadetes |
| 2.4 | Historial liquidaciones cadete |
| 2.5 | `restaurantCommissionBatches` + cobro comisiones retiro efectivo |
| 2.6 | Admin: restaurantes con deuda pendiente + marcar cobrada |

---

### Fase 3 — Tracking Capacitor (2–3 semanas)

| # | Entregable |
|---|------------|
| 3.1–3.6 | Geolocation, Firestore, mapa comprador app, permisos |

---

### Fase 4 — Optimización (continuo)

Rutas por calle, reportes, background GPS, automatización pagos.

---

## 10. Cronograma estimado

| Fase | Duración | Dependencias |
|------|----------|--------------|
| Fase 1 | 3–4 semanas | Tarifas y martes confirmados |
| Fase 2 | 1–2 semanas | Fase 1 |
| Fase 3 | 2–3 semanas | Capacitor |
| Fase 4 | Continuo | — |

---

## 11. Decisiones del cliente

| # | Decisión | Estado |
|---|----------|--------|
| 1 | Comisión 12% solo sobre comida | ✅ Confirmado |
| 2 | Delivery solo Mercado Pago | ✅ Confirmado |
| 3 | Retiro: MP o efectivo | ✅ Confirmado |
| 4 | Retiro efectivo → **Opción B** (comisión acumulada) | ✅ **Aprobada** |
| 5 | Tarifa cliente | ✅ **$1.000 ARS / km** |
| 6 | Tarifa cadete | ✅ **$800 ARS / km** |
| 7 | Liquidación cadetes | ✅ **Martes** (corte martes–lunes) |
| 8 | Liquidación comisiones restaurante | ✅ **Martes** (mismo período) |
| 9 | Distancia cadete: restaurante → cliente | ✅ Confirmado |

---

## 12. Aprobación

| Rol | Nombre | Firma | Fecha |
|-----|--------|-------|-------|
| Cliente | | | |
| Servido / Desarrollo | | | |

---

*Documento v1.3 — Tarifas: $1.000/km cliente, $800/km cadete. Liquidaciones cada martes. Delivery solo MP. Retiro efectivo Opción B.*
