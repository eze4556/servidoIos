/** True when the page runs inside the Capacitor native shell (iOS/Android). */
export function isNativeCapacitor(): boolean {
  if (typeof window === "undefined") return false
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  try {
    return Boolean(cap?.isNativePlatform?.())
  } catch {
    return false
  }
}
