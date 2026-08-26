# Soporte: reclamos, reembolsos y sanciones

Guía operativa para el equipo de Servido. El dinero de un reembolso **sale siempre de la cuenta Mercado Pago del vendedor**. Servido no usa plata propia.

---

## Dónde se gestiona

| Rol | Dónde |
|-----|--------|
| Comprador | `/dashboard/buyer` → pestaña **Reclamos** · Mis compras → **Tuve un problema** |
| Vendedor | `/dashboard/seller?tab=claims` |
| Detalle del caso | `/dashboard/claims/[id]` |
| Admin | `/admin` → **Reclamos** |

---

## Flujo resumido

1. El comprador paga con Mercado Pago.
2. Si hay un problema, abre un reclamo desde **Mis compras** (pago aprobado / pagado).
3. El vendedor tiene **72 horas** para responder.
4. Puede proponer: reenvío, reembolso parcial/total o acuerdo alternativo.
5. El comprador acepta o rechaza la propuesta.
6. Si hace falta, **admin** revisa, decide y (si corresponde) ejecuta el reembolso en Mercado Pago.
7. Ante incumplimientos reiterados, admin aplica sanciones **a mano** (no son automáticas).

---

## Motivos que puede elegir el comprador

- El producto no llegó  
- El producto llegó dañado  
- Recibí un producto incorrecto  
- El pedido llegó incompleto  
- El vendedor no responde  
- Quiero cancelar la compra  
- Otro problema  

Puede adjuntar fotos o PDF y proponer una solución inicial.

**Regla:** un solo reclamo **abierto** por compra + producto (`purchaseId` + `productId`).

---

## Estados del caso (qué significan)

| Estado en pantalla | Qué pasa |
|--------------------|----------|
| Esperando respuesta del vendedor | Caso nuevo; corre el plazo de 72 h |
| Vendedor respondió / Esperando comprador | Hay mensajes o ida y vuelta |
| Acuerdo propuesto | El vendedor ofreció una solución formal |
| Acuerdo aceptado | El comprador aceptó; si es reembolso, admin lo ejecuta |
| En revisión por Servido | Admin intervino o el plazo venció sin respuesta |
| Reembolso parcial/total solicitado | Queda pendiente ejecutar en MP |
| Reembolso procesando | Se envió a Mercado Pago; esperamos confirmación |
| Reembolso aprobado | Confirmado por MP (webhook) |
| Reembolso rechazado | MP o el proceso falló; revisar y reintentar si aplica |
| Reclamo rechazado | Admin cerró en contra del reclamo |
| Caso cerrado | Cierre por acuerdo u otro cierre formal |

---

## Plazos y alertas automáticas (SLA)

| Momento | Qué hace el sistema |
|---------|---------------------|
| Al abrir el reclamo | Guarda deadline: **72 h** (`sellerRespondBy`) |
| Quedan **~24 h** | Notifica a vendedor y comprador (recordatorio) |
| Vencen las **72 h** sin respuesta del vendedor | Pasa a **En revisión**, marca **prioridad**, avisa a admins, comprador y vendedor |

Cron en Vercel: `GET /api/cron/claims-sla` (diario). Requiere `CRON_SECRET` en producción.

En la cola admin también hay filtro **Por vencer** (casos abiertos con poco tiempo restante).

---

## Qué puede hacer el vendedor

1. Responder en el hilo y adjuntar pruebas (tracking, fotos, PDF).
2. Proponer solución:
   - **Reenvío** → tracking obligatorio  
   - **Reembolso parcial** → importe menor al total  
   - **Reembolso total**  
   - **Acuerdo alternativo**  
3. Si el comprador acepta un reembolso, **aún no se mueve plata**: queda para que admin lo ejecute.

---

## Qué puede hacer el admin

En `/admin` → **Reclamos**, al abrir un caso:

### Decisiones del caso
- Marcar / quitar prioridad  
- Pasar a revisión  
- Cerrar por acuerdo  
- Rechazar reclamo  

### Reembolso real (Mercado Pago)
1. Verificar **Payment ID** y estado de **Mercado Pago del vendedor** (conectado / vencido / sin conectar).
2. Elegir **total** o **parcial** (si es parcial, cargar importe).
3. Pulsar **Ejecutar reembolso**.

| Situación | Qué hacer |
|-----------|-----------|
| Vendedor sin MP o token vencido | **No se reembolsa**. Queda pendiente; el vendedor debe reconectar MP |
| Ejecución OK | Estado → procesando → aprobado cuando confirma MP |
| MP rechaza | Estado → reembolso rechazado; revisar mensaje / historial |

### Antecedentes y sanciones
En el mismo detalle del reclamo aparece el panel del vendedor:

- Totales: reclamos, abiertos, cerrados, rechazados, reembolsos, sin respuesta a tiempo, advertencias, suspensiones  
- Flags: ventas bloqueadas, revisión manual, cuenta activa, límite de publicaciones  

**Medidas (siempre manuales):**

| Medida | Efecto |
|--------|--------|
| Advertencia | Suma contador y notifica |
| Limitar publicaciones | Guarda tope (`productUploadLimit`) |
| Bloquear ventas | Impide nuevas compras en checkout |
| Suspender cuenta | `isActive = false` + bloquea ventas |
| Marcar revisión manual | Flag interno |
| Quitar bloqueo / quitar revisión / reactivar | Revierte según corresponda |

Cada medida queda en historial (`claimSanctions`), en el evento del reclamo y notifica al vendedor.

---

## Checklist rápido para soporte

### Comprador dice “no me devolvieron la plata”
1. Abrir el reclamo en admin.  
2. Ver estado: ¿procesando, aprobado, rechazado, bloqueado por MP?  
3. Si dice conexión MP: pedir al vendedor que reconecte Mercado Pago y reintentar.  
4. Si está aprobado: el dinero lo acredita Mercado Pago (plazos propios de MP).  

### Vendedor no responde
1. Verificar si ya pasó el plazo (escalado automático a revisión).  
2. Si no escaló aún, esperar el cron o pasar a revisión a mano.  
3. Decidir: acuerdo, reembolso o rechazo.  

### Vendedor reiterado
1. Revisar **Antecedentes del vendedor**.  
2. Aplicar advertencia → bloqueo de ventas → suspensión según gravedad.  
3. Documentar el motivo en la nota de la sanción.  

### No se puede ejecutar el reembolso
- Falta `payment_id` en el reclamo  
- Vendedor sin MP conectado o token vencido  
- Pago ya reembolsado en MP  
- Importe parcial inválido  

---

## Notificaciones típicas (in-app)

- Nuevo reclamo → vendedor  
- Mensajes / propuesta aceptada o rechazada → la otra parte  
- Plazo por vencer / vencido → partes (+ admins al escalar)  
- Reembolso iniciado / acreditado / fallido → comprador y vendedor  
- Sanción → vendedor  
- Alerta MP bloqueado (reclamos con error de conexión) → admins  

---

## Qué no hace el sistema solo

- No aplica sanciones automáticamente (solo las elige admin).  
- No usa dinero de Servido para reembolsos.  
- No ejecuta el reembolso solo porque el comprador aceptó la propuesta: hace falta acción de admin.  

---

## Datos útiles para depurar

| Campo / lugar | Para qué |
|---------------|----------|
| `paymentId` | Pago original en Mercado Pago |
| `purchaseId` | Compra en Servido |
| Historial del reclamo | Eventos (apertura, SLA, refund, sanción) |
| Notas internas | Solo visibles para admin |
| Antecedentes del vendedor | Contexto antes de sancionar |

---

*Última actualización alineada al circuito de reclamos etapas 0–6.*
