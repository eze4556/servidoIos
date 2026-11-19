import { readFileSync, existsSync } from "node:fs"
import assert from "node:assert/strict"
import plist from "plist"

const readPlist = (path) => plist.parse(readFileSync(path, "utf8"))
const info = readPlist("ios/App/App/Info.plist")
for (const key of ["NSCameraUsageDescription", "NSMicrophoneUsageDescription", "NSPhotoLibraryUsageDescription", "NSPhotoLibraryAddUsageDescription", "NSLocationWhenInUseUsageDescription", "NSLocationAlwaysAndWhenInUseUsageDescription"]) {
  assert.ok(info[key]?.length > 20, `Falta el motivo de ${key}`)
}
assert.equal(info.FirebaseAppDelegateProxyEnabled, false, "APNs se conecta a FCM en AppDelegate")
assert.ok(!info.UIBackgroundModes?.includes("location"), "No declarar GPS en segundo plano hasta implementar seguimiento nativo")
assert.equal(readPlist("ios/App/App/App.entitlements")["aps-environment"], "development")
const project = readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8")
assert.ok(project.includes("ar.com.servido.app"))
assert.ok(project.includes("App/App.entitlements"))
assert.ok(project.includes("GoogleService-Info.plist in Resources"))
assert.ok(readFileSync("ios/App/Podfile", "utf8").includes("pod 'FirebaseMessaging'"))
const pkg = JSON.parse(readFileSync("package.json", "utf8"))
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"))
assert.equal(pkg.dependencies["@capacitor/ios"], lock.packages[""].dependencies["@capacitor/ios"])

if (process.argv.includes("--ci")) {
  for (const name of ["NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "NEXT_PUBLIC_FIREBASE_APP_ID"]) {
    assert.ok(process.env[name]?.trim(), `Falta ${name} en Codemagic`)
  }
  const url = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "")
  assert.equal(url.protocol, "https:", "El backend debe usar HTTPS")
  assert.ok(!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname), "Usar el backend de producción")
  const googlePath = "ios/App/App/GoogleService-Info.plist"
  assert.ok(existsSync(googlePath), "Falta GoogleService-Info.plist de la app iOS")
  const google = readPlist(googlePath)
  assert.equal(google.BUNDLE_ID, "ar.com.servido.app", "El plist debe ser de Servido iOS")
  assert.equal(google.PROJECT_ID, process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, "Firebase web e iOS deben ser del mismo proyecto")
  assert.equal(String(google.GCM_SENDER_ID), process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, "Firebase sender ID no coincide")
  assert.ok(google.GOOGLE_APP_ID, "Falta GOOGLE_APP_ID de Firebase iOS")
}
console.log("[ios] Configuración verificada" + (process.argv.includes("--ci") ? " con variables de producción" : " (sin validar credenciales externas)"))
