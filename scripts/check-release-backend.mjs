import assert from "node:assert/strict"

const raw = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_APP_URL
assert.ok(raw, "Falta la URL del backend de producción")
const base = new URL(raw)
assert.equal(base.protocol, "https:", "El backend de Servido debe usar HTTPS")
assert.ok(["www.servido.com.ar", "servido.com.ar"].includes(base.hostname), "El destino no es el dominio de producción autorizado de Servido")
const options = { redirect: "error", signal: AbortSignal.timeout(20000), cache: "no-store" }
const manifest = await fetch(new URL("/api/app/release", base), options)
assert.equal(manifest.status, 200, "El backend nuevo todavía no está desplegado")
const release = await manifest.json()
assert.equal(release.appId, "ar.com.servido.app", "El backend no corresponde a Servido")
assert.ok(release.apiVersion >= 2, "El backend no incluye la revisión necesaria")
for (const feature of ["account-deletion", "content-reports", "user-blocking"]) {
  assert.ok(release.capabilities?.includes(feature), `Falta ${feature} en el backend`)
}
// No user credentials or data: every request must be denied before any mutation.
for (const [method, path] of [["POST", "/api/account/delete"], ["POST", "/api/safety/reports"], ["POST", "/api/safety/blocks"], ["GET", "/api/admin/content-reports"]]) {
  const response = await fetch(new URL(path, base), { ...options, method, signal: AbortSignal.timeout(20000) })
  assert.equal(response.status, 401, `${path}: se esperaba rechazo de la solicitud sin sesión`)
  assert.ok(response.headers.get("content-type")?.includes("application/json"), `${path}: respuesta inesperada`)
  assert.equal((await response.json()).error, "No autorizado", `${path}: no se pudo validar el control de acceso`)
}
console.log(`[release] Backend de Servido verificado en ${base.origin}; endpoints protegidos sin realizar cambios`)
