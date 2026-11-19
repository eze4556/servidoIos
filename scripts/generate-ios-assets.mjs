import sharp from "sharp"
import { mkdirSync, writeFileSync } from "node:fs"

const assets = "ios/App/App/Assets.xcassets"
const logo = await sharp("public/images/logo.png").trim({ threshold: 10 }).toBuffer()
const mark = await sharp(logo).resize(820, 820, { fit: "inside" }).toBuffer()
mkdirSync(`${assets}/AppIcon.appiconset`, { recursive: true })
await sharp({ create: { width: 1024, height: 1024, channels: 3, background: "#ffffff" } })
  .composite([{ input: mark, gravity: "center" }]).removeAlpha().png()
  .toFile(`${assets}/AppIcon.appiconset/AppIcon-512@2x.png`)
writeFileSync(`${assets}/AppIcon.appiconset/Contents.json`, JSON.stringify({
  images: [{ filename: "AppIcon-512@2x.png", idiom: "universal", platform: "ios", size: "1024x1024" }],
  info: { author: "xcode", version: 1 },
}, null, 2) + "\n")
const splashMark = await sharp(logo).linear(0, 255).resize(900, 900, { fit: "inside" }).toBuffer()
const splash = await sharp({ create: { width: 2732, height: 2732, channels: 3, background: "#2e1065" } })
  .composite([{ input: splashMark, gravity: "center" }]).removeAlpha().png().toBuffer()
for (const file of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
  writeFileSync(`${assets}/Splash.imageset/${file}`, splash)
}
console.log("[ios] Ícono opaco de 1024 px y splash de Servido generados")
