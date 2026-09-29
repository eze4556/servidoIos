# Lives nativos para tiendas (MVP) — en implementación

Estado: **en curso**. Primera versión para sellers de productos/servicios.

## Decisiones cerradas

- Nivel: Fase B nativa (stream dentro de Servido).
- Quién transmite: solo `role === "seller"` y `businessType !== "restaurant"`.
- Proveedor: LiveKit Cloud.
- Fuera del MVP: restaurantes, creators, replay, cupones live-only, agenda avanzada.

## Env requerido

```env
NEXT_PUBLIC_LIVEKIT_URL=wss://….livekit.cloud
LIVEKIT_API_KEY=…
LIVEKIT_API_SECRET=…
```

## Qué ya está en el código

1. Tipos `types/live.ts`
2. APIs: `/api/lives/start`, `/api/lives/[id]/end|pin|token|chat`
3. Cliente `lib/lives.ts` + LiveKit server helper
4. UI: LiveStudio (`/dashboard/seller/live`), viewer (`/lives` y `/lives/[id]`), rail en home
5. Push a seguidores al iniciar (hasta 80)
6. Reglas Firestore + índices compuestos
7. Permisos Android cámara/mic

## Pendiente operativo

- Crear proyecto LiveKit Cloud y cargar env en `.env.local` + Vercel
- Deploy reglas/índices Firestore (`firebase deploy --only firestore`)
- Probar host + viewer en web y Capacitor
- Nuevo AAB cuando Lives esté listo para Play Store

## Flujo

1. Seller abre `/dashboard/seller/live` → start → token LiveKit → publica cam/mic
2. Seguidores reciben notificación → `/lives/{id}`
3. Viewer mira, chatea y toca **Comprar** si hay producto pinneado
4. Seller termina → room LiveKit borrada + `status: ended`
