import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "ar.com.servido.app",
  appName: "Servido",
  // Salida del export estático de Next (next build con output: "export").
  // No apuntar a ".next": es el build interno de Next, no una raíz web servible.
  webDir: "out",
  android: {
    // https evita que Firebase/Firestore traten el origen como inseguro.
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#2e1065",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      // Iconos claros sobre el fondo servido-950.
      style: "DARK",
      backgroundColor: "#2e1065",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "native",
      resizeOnFullScreen: true,
    },
  },
}

export default config
