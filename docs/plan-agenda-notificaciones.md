# Plan corto — Agenda de servicios + Notificaciones

Fecha: 2026-07-21 (actualizado 2026-07-22)  
Estado: **Notificaciones MVP listo** · **Agenda de servicios MVP listo**

---

## Qué significa “Después: push al celular y preferencias”

| Ahora (MVP) | Después |
|-------------|---------|
| **In-app**: campanita + página `/notifications`. Solo se ve si abrís Servido. | **Push**: aviso en la barra del celular/navegador aunque la app esté cerrada (FCM / PWA). |
| Todos los tipos de aviso llegan al mismo buzón. | **Preferencias**: el usuario elige “sí quiero envíos / no quiero promos”, etc. |

No bloquean el MVP: primero el buzón real; push y toggles se suman encima.

---

## 1) Panel de servicios con agenda

### Idea
Que los servicios no sean solo un “producto” a comprar: el cliente **elige día/hora**, queda en una **agenda**, y ambos reciben aviso.

### Hecho (MVP)
1. Disponibilidad por servicio (`serviceSchedule` en `products`).  
2. Reserva de turno desde la ficha del servicio.  
3. Estados: `pending` → `confirmed` → `completed` / `cancelled` / `rejected`.  
4. Tab **Agenda** en panel vendedor + **Mis turnos** en comprador.  
5. Avisos in-app al pedir / confirmar / rechazar / cancelar.

### Fuera de esta fase
- Google Calendar / Zoom  
- Pagos parciales por seña  
- Recurrencia tipo “todos los lunes”  
- Recordatorio automático 24h / 1h antes (siguiente)

---

## 2) Notificaciones funcionales (MVP)

### Hecho
1. Modelo unificado en `notifications`: `userId`, `type`, `title`, `body`, `link`, `read`, `createdAt`, `dedupeKey`.  
2. Helper `lib/notifications.ts` + campanita con contador (`NotificationBell`).  
3. Página `/notifications` en tiempo real (sin mocks).  
4. Eventos enganchados:
   - Envíos producto (ya existían; campos unificados)
   - Pedidos comida (cambio de estado restaurante / cadete)
   - Suscripción ≤7 días (al abrir la app, máx. 1/día)

### Pendiente (mismo módulo)
- Avisos de pago multi-vendedor (aprobado / fallido)
- Agenda de servicios + recordatorios de turno
- Push FCM/PWA
- Preferencias por tipo de aviso

---

## Orden de build

| Paso | Entrega | Estado |
|------|---------|--------|
| A | Centro de notificaciones + campanita | Hecho |
| B | Suscripción + envíos + comida | Hecho (base) |
| C | Agenda/turnos de servicios | Hecho (MVP) |
| D | Recordatorios de turnos (24h / 1h) | Pendiente |
| E | Push + preferencias | Después |

---

## Frase para el cliente

> “Vamos a tener una agenda de turnos para servicios, con avisos al cliente y al prestador, y un centro de notificaciones de verdad: vencimiento de suscripción, despachos, pedidos y recordatorios de citas. Después se suma el push al celular y que cada uno elija qué avisos quiere.”
