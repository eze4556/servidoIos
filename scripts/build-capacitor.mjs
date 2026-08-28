/**
 * Build del bundle estático que se empaqueta dentro del APK.
 *
 * Saca del árbol de rutas dos cosas que `output: "export"` no puede generar:
 *
 * 1. Las rutas de app/api, que dependen de firebase-admin, MercadoPago y Resend.
 *    Solo corren en servidor y siguen viviendo en Vercel.
 * 2. Las páginas con segmento dinámico ([id], [chatId]), porque sus ids son
 *    contenido de usuarios y no se conocen en tiempo de build. La app llega al
 *    mismo contenido por las entradas con query (ver lib/routes.ts).
 * 3. middleware.ts, que sólo existe para habilitar CORS en la API y que
 *    `output: "export"` rechaza por depender de un servidor.
 *
 * Para (2) no sirve darles un generateStaticParams: la sola presencia de esa
 * función convierte la ruta en SSG y rompe el build web con DYNAMIC_SERVER_USAGE,
 * porque el i18n lee cookies() al renderizar.
 *
 * Se renombra archivo por archivo en lugar de mover carpetas porque en Windows
 * el indexador del editor mantiene un handle sobre los directorios y el rename
 * de carpeta falla con "Acceso denegado"; el de archivos sí funciona. Excluirlas
 * vía pageExtensions tampoco sirve: rompe la resolución interna de las páginas
 * ("Can't resolve private-next-app-dir/.../page").
 */
import { execSync } from "node:child_process"
import { existsSync, readFileSync, readdirSync, renameSync, rmSync, statSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const appDir = join(root, "app")
const apiDir = join(appDir, "api")
const middlewareFile = join(root, "middleware.ts")
const SUFFIX = ".capoff"

const isApiRoute = (file) => /[\\/]route\.tsx?$/.test(file)
/** Página bajo un segmento dinámico, del tipo app/product/[id]/page.tsx. */
const isDynamicPage = (file) =>
  /[\\/]page\.tsx?$/.test(file) && /[\\/]\[[^\\/]+\][\\/]/.test(file)

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

const disabled = []

function restore() {
  let restored = 0
  for (const file of disabled.splice(0)) {
    try {
      renameSync(file + SUFFIX, file)
      restored++
    } catch {
      console.error(`[capacitor] No pude restaurar ${file}${SUFFIX}`)
    }
  }
  if (restored) console.log(`[capacitor] ${restored} rutas restauradas`)
}

// Si una corrida anterior quedó a medias, devolver esos archivos antes de nada.
function healLeftovers() {
  if (!existsDir(appDir)) return
  const leftovers = walk(appDir).filter((f) => f.endsWith(SUFFIX))
  if (existsSync(middlewareFile + SUFFIX)) leftovers.push(middlewareFile + SUFFIX)
  for (const file of leftovers) {
    renameSync(file, file.slice(0, -SUFFIX.length))
  }
  if (leftovers.length) {
    console.log(`[capacitor] ${leftovers.length} rutas de una corrida previa recuperadas`)
  }
}

function existsDir(path) {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    restore()
    process.exit(1)
  })
}

/**
 * Busca una variable en el entorno o en los archivos .env, porque a este script
 * Next todavía no le cargó nada: los .env los lee el proceso hijo.
 */
function readEnvVar(name) {
  if (process.env[name]?.trim()) return process.env[name].trim()
  for (const file of [".env.local", ".env.production", ".env"]) {
    const path = join(root, file)
    if (!existsSync(path)) continue
    const match = readFileSync(path, "utf8").match(new RegExp(`^\\s*${name}\\s*=\\s*(.+)$`, "m"))
    const value = match?.[1].trim().replace(/^["']|["']$/g, "")
    if (value) return value
  }
  return ""
}

// Sin esto el APK saldría con fetch a rutas relativas, que dentro del WebView
// pegan contra el propio bundle: la app compilaría pero fallaría en runtime.
function requireApiBase() {
  const raw = readEnvVar("NEXT_PUBLIC_API_BASE_URL") || readEnvVar("NEXT_PUBLIC_APP_URL")
  if (!raw) {
    throw new Error(
      "Falta NEXT_PUBLIC_APP_URL (o NEXT_PUBLIC_API_BASE_URL) con la URL del backend.\n" +
        "El APK la necesita para llamar a las rutas de API, que no viajan dentro del bundle."
    )
  }
  try {
    new URL(raw)
  } catch {
    throw new Error(`NEXT_PUBLIC_APP_URL no es una URL válida: ${raw}`)
  }
  console.log(`[capacitor] las rutas de API apuntarán a ${new URL(raw).origin}`)
}

try {
  requireApiBase()
  healLeftovers()

  let apiCount = 0
  let dynamicCount = 0
  for (const file of walk(appDir)) {
    const isApi = file.startsWith(apiDir) && isApiRoute(file)
    if (!isApi && !isDynamicPage(file)) continue
    renameSync(file, file + SUFFIX)
    disabled.push(file)
    if (isApi) apiCount++
    else dynamicCount++
  }
  if (existsSync(middlewareFile)) {
    renameSync(middlewareFile, middlewareFile + SUFFIX)
    disabled.push(middlewareFile)
  }

  console.log(
    `[capacitor] excluidas del export: ${apiCount} rutas de API, ${dynamicCount} páginas dinámicas, middleware`
  )

  const webDir = join(root, "out")
  rmSync(webDir, { recursive: true, force: true })

  execSync("npx next build", {
    stdio: "inherit",
    env: {
      ...process.env,
      CAPACITOR: "1",
      // Se lee en lib/routes.ts para que los links usen ?id= en lugar del path.
      NEXT_PUBLIC_CAPACITOR: "1",
    },
  })

  if (!existsSync(join(webDir, "index.html"))) {
    throw new Error("El export no generó index.html en out/")
  }
  console.log("\n[capacitor] export estático listo en out/")
} finally {
  restore()
}
