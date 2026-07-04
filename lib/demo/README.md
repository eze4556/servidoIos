# Modo demo (presentación al cliente)

Activa datos de ejemplo en la web sin tocar Firebase.

## Activar

En `.env.local`:

```
NEXT_PUBLIC_DEMO_MODE=true
```

Reiniciá el servidor (`npm run dev`).

## Desactivar

```
NEXT_PUBLIC_DEMO_MODE=false
```

o borrá la variable.

## Eliminar por completo

1. Borrá la carpeta `lib/demo/`
2. Borrá `components/demo/`
3. Quitá las importaciones de `@/lib/demo` en las páginas
4. Quitá `<DemoModeBanner />` de `app-chrome.tsx`
