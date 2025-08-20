# 📱 Guía de Configuración Capacitor - Servido Marketplace (iOS)

- ✅ **Next.js 15** ya está configurado
- ✅ **React 19** funcionando perfecto
- ✅ **TypeScript** configurado
- ✅ **Firebase** conectado y funcionando
- ✅ **Todas las dependencias** instaladas


### **1. Instalar Capacitor Core**
```bash
# Primero navega al proyecto
cd newFrontServido

# Ahora instala las dependencias de Capacitor
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios

# Verifica que se instaló correctamente
npx cap --version
```

### **2. Inicializar Capacitor**
```bash
# Inicializa Capacitor en tu proyecto
npx cap init "Servido" "ar.com.servido.app"

# Te va a preguntar:
# App Name: Servido
# App ID: ar.com.servido.app
```

### **3. Construir el proyecto**
```bash

npm run build

# Verifica que se creó la carpeta .next
ls -la .next
```

### **4. Agregar plataforma iOS**
```bash
# Agrega la plataforma iOS
npx cap add ios

# Sincroniza todos los archivos
npx cap sync
```

## ⚙️ **Configuración que ya tienes lista**

### **Tu archivo capacitor.config.ts ya está configurado:**
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ar.com.servido.app',
  appName: 'Servido',
  webDir: '.next',
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: "#8B5CF6",
      showSpinner: true,
      spinnerColor: "#FFFFFF"
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#8B5CF6'
    }
  }
};

export default config;
```

## 📱 **Desarrollo y pruebas**

### **Para probar en iOS:**
```bash
# Sincroniza los cambios
npx cap sync ios

# Abre en Xcode
npx cap open ios

# Ejecuta en el simulador
npx cap run ios
```

## 🔧 **Ajustes que podrías necesitar**

### **1. Navegación móvil (opcional)**
```typescript
// Si quieres navegación más móvil, instala esto:
npm install @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
```

### **2. Gestos táctiles (opcional)**
```typescript
// Para mejor experiencia táctil:
npm install react-native-gesture-handler
npm install react-native-reanimated
```

### **3. Iconos móviles**
```bash
# Genera iconos para iOS
npx @capacitor/assets generate --iconPath=./public/images/logo-512.png
```

## 📱 **Configuración en Xcode**

### **Cuando abras el proyecto en Xcode:**
1. **Abre el proyecto:** `npx cap open ios`
2. **Configura Bundle ID:** `ar.com.servido.app`
3. **Configura tu Team:** Tu cuenta Apple Developer
4. **Configura Certificados:** Desarrollo y distribución
5. **Configura Info.plist:** Los permisos que necesites

## 🔐 **Permisos que vas a necesitar**

### **En tu Info.plist:**
```xml
<!-- Cámara -->
<key>NSCameraUsageDescription</key>
<string>Servido necesita acceso a la cámara para tomar fotos de productos</string>

<!-- Fotos -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Servido necesita acceso a tus fotos para seleccionar imágenes</string>

<!-- Ubicación -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Servido necesita tu ubicación para mostrar productos cercanos</string>

<!-- Notificaciones -->
<key>NSUserNotificationUsageDescription</key>
<string>Servido te enviará notificaciones sobre tus pedidos</string>
```



