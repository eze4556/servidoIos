/**
 * Genera los iconos de Android a partir del logo de Servido.
 *
 * Produce tres cosas distintas, que Android trata de forma distinta:
 *
 * 1. Icono adaptativo (mipmap-anydpi-v26): capa de fondo + capa de figura. Es
 *    el que usan Android 8+ y el que ve el 99% de los usuarios.
 * 2. Iconos legacy (ic_launcher.png por densidad) para Android 7 y abajo.
 * 3. Icono chico de notificación: silueta blanca sobre transparente, porque el
 *    sistema descarta el color y lo pinta plano.
 *
 * Para (3) se usa sólo la mano, sin el wordmark: a 24dp "Servido" es ilegible.
 * La mano no se puede recortar con un rectángulo porque su barrido sube por
 * detrás de las letras, así que se aísla por componentes conexas.
 *
 * Correr con: node scripts/generate-android-icons.mjs [--preview]
 */
import sharp from "sharp"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const SOURCE = "public/images/logo.png"
const RES = "android/app/src/main/res"
const preview = process.argv.includes("--preview")

/** Fondo de marca. Va plano y no en degradado: Android recorta el icono con
 *  formas distintas según el launcher y un degradado se corta raro. */
const BRAND_BG = "#6d28d9"

const trimmed = await sharp(SOURCE).trim({ threshold: 10 }).toBuffer()
const source = await sharp(trimmed).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width, height } = source.info
const data = source.data

const isOpaque = (x, y) => data[(y * width + x) * 4 + 3] > 40

/** Marca todos los píxeles conectados al punto dado. */
function flood(seedX, seedY, mask) {
  if (!isOpaque(seedX, seedY)) throw new Error(`Semilla transparente en ${seedX},${seedY}`)
  const stack = [seedY * width + seedX]
  mask[stack[0]] = 1
  while (stack.length) {
    const index = stack.pop()
    const x = index % width
    const y = (index - x) / width
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      const next = ny * width + nx
      if (mask[next] || !isOpaque(nx, ny)) continue
      mask[next] = 1
      stack.push(next)
    }
  }
}

/** La mano: palma y puño, cada uno su propia figura. */
function extractHand() {
  const mask = new Uint8Array(width * height)
  flood(Math.round(width * 0.35), Math.round(height * 0.75), mask)
  flood(Math.round(width * 0.02), Math.round(height * 0.75), mask)

  const out = Buffer.alloc(width * height * 4)
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue
    out[i * 4] = data[i * 4]
    out[i * 4 + 1] = data[i * 4 + 1]
    out[i * 4 + 2] = data[i * 4 + 2]
    out[i * 4 + 3] = data[i * 4 + 3]
  }
  return sharp(out, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer()
    .then((buf) => sharp(buf).trim({ threshold: 10 }).png().toBuffer())
}

/** Repinta una marca en blanco conservando su silueta. */
async function toWhite(mark) {
  const { data: raw, info } = await sharp(mark)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  for (let i = 0; i < raw.length; i += 4) {
    raw[i] = 255
    raw[i + 1] = 255
    raw[i + 2] = 255
  }
  return sharp(raw, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer()
}

/** Centra una marca dentro de un lienzo cuadrado. */
async function centerOn(mark, size, coverage, background) {
  const inner = Math.round(size * coverage)
  const resized = await sharp(mark)
    .resize({ width: inner, height: inner, fit: "inside" })
    .toBuffer()
  const meta = await sharp(resized).metadata()
  const canvas = background
    ? sharp({
        create: { width: size, height: size, channels: 4, background },
      })
    : sharp({
        create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
      })
  return canvas
    .composite([
      {
        input: resized,
        left: Math.round((size - meta.width) / 2),
        top: Math.round((size - meta.height) / 2),
      },
    ])
    .png()
    .toBuffer()
}

function write(relativePath, buffer) {
  const full = join(RES, relativePath)
  mkdirSync(join(full, ".."), { recursive: true })
  writeFileSync(full, buffer)
  console.log(`  ${relativePath}`)
}

const hand = await extractHand()
const handMeta = await sharp(hand).metadata()
console.log(`mano aislada: ${handMeta.width}x${handMeta.height}`)

if (preview) {
  await sharp(await centerOn(hand, 432, 0.62, "#ffffff")).toFile("scripts/tmp-preview-mano.png")
  await sharp(await centerOn(await toWhite(hand), 432, 0.62, BRAND_BG)).toFile(
    "scripts/tmp-preview-mano-blanca.png"
  )
  await sharp(await centerOn(trimmed, 432, 0.68, "#ffffff")).toFile(
    "scripts/tmp-preview-completo.png"
  )
  console.log("previews en scripts/tmp-preview-*.png")
  process.exit(0)
}

// --- Icono de la app -------------------------------------------------------
// La capa de figura se dibuja al 108dp pero sólo los 72dp centrales están
// garantizados: el launcher recorta y anima el resto. Por eso la marca ocupa
// ~40% del lienzo y no más.
const FOREGROUND = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 }
const LEGACY = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }

console.log("\nicono de la app:")
const whiteHand = await toWhite(hand)
for (const [density, size] of Object.entries(FOREGROUND)) {
  write(`mipmap-${density}/ic_launcher_foreground.png`, await centerOn(whiteHand, size, 0.42))
}
for (const [density, size] of Object.entries(LEGACY)) {
  const icon = await centerOn(whiteHand, size, 0.6, BRAND_BG)
  write(`mipmap-${density}/ic_launcher.png`, icon)
  write(`mipmap-${density}/ic_launcher_round.png`, icon)
}

// --- Icono de notificación -------------------------------------------------
// Sólo cuenta el canal alfa; el blanco es por prolijidad.
const NOTIFICATION = { mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 }
console.log("\nicono de notificación:")
for (const [density, size] of Object.entries(NOTIFICATION)) {
  write(`drawable-${density}/ic_stat_servido.png`, await centerOn(whiteHand, size, 0.9))
}

console.log("\nlisto")
