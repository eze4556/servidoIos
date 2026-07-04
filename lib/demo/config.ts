/**
 * Modo demo para presentaciones al cliente.
 * Activar:  NEXT_PUBLIC_DEMO_MODE=true  en .env.local
 * Desactivar: eliminar la variable o poner NEXT_PUBLIC_DEMO_MODE=false
 * Quitar todo: borrar la carpeta lib/demo y las importaciones asociadas.
 */
export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true"
