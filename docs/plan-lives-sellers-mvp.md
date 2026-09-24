# Lives nativos para tiendas (MVP) — pendiente de implementar

Estado: **aprobado para implementar más adelante**. No ejecutar hasta indicación explícita.

## Decisiones cerradas

- Nivel: Fase B nativa (stream dentro de Servido).
- Quién transmite: solo `role === "seller"` y `businessType !== "restaurant"` (productos + servicios).
- Proveedor: LiveKit Cloud (plan Build gratis al inicio).
- Fuera del MVP: restaurantes, creators, replay, cupones live-only, agenda avanzada.

## Resumen para el cliente

El vendedor transmite desde Servido; el comprador mira, chatea y compra sin salir. Primera versión solo tiendas de productos y servicios, con productos pinneados, chat, rail En vivo y aviso a seguidores.

## Flujo técnico (MVP)

1. Cuenta LiveKit + env (`NEXT_PUBLIC_LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`).
2. APIs: token, start, end, pin.
3. Firestore `lives` + mensajes de sala.
4. UI LiveStudio (seller) + viewer (buyer).
5. Rail home `/lives` + push a seguidores.
6. Permisos cámara/mic Android.

Plan Cursor detallado: `lives_sellers_mvp` (archivo de plan en `.cursor/plans`).
