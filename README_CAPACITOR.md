# 📱 Servido Marketplace - Ready for Capacitor (iOS)

## 🎯 **Estado del Proyecto**

**✅ PROYECTO WEB COMPLETADO**  
**✅ PREPARADO PARA CAPACITOR**  
**✅ ¡LISTO PARA CONVERTIR A APP MÓVIL iOS!**

---


**Servido** es una plataforma completa de e-commerce que permite a vendedores ofrecer productos y servicios, y a compradores realizar compras de manera segura.

### **Funcionalidades:**
- 🔐 **Autenticación** con Firebase
- 🛒 **Carrito de compras** completo
- 💳 **Pagos** con MercadoPago
- 💬 **Chat en tiempo real** entre usuarios
- 📱 **Dashboard** para compradores y vendedores
- 🎨 **Panel de administración** completo
- 🔍 **Sistema de búsqueda** avanzado
- 📸 **Gestión de imágenes** y archivos

---

## 📱 **Convertir a App Móvil iOS**

### **Opción 1: Instalación Automática (RECOMENDADO)**

#### **Para Linux/Mac:**
```bash
chmod +x setup-capacitor.sh
./setup-capacitor.sh
```

#### **Para Windows (PowerShell):**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\setup-capacitor.ps1
```

### **Opción 2: Instalación Manual**

```bash
# 1. Instalar Capacitor
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios

# 2. Inicializar Capacitor
npx cap init "Servido" "ar.com.servido.app"

# 3. Construir proyecto
npm run build

# 4. Agregar plataforma iOS
npx cap add ios

# 5. Sincronizar archivos
npx cap sync
```

---

## 🔧 **Desarrollo y pruebas**

### **Abrir en IDE:**
```bash
# Para iOS (Xcode)
npx cap open ios
```

### **Sincronizar cambios:**
```bash

npm run build
npx cap sync
```

---

## 📱 **Plataforma que soporta**

### **iOS únicamente:**
- ✅ **iOS 13+** (iPhone 6s en adelante)
- ✅ **iPhone SE, 12, 13, 14, 15**
- ✅ **iPad** (todas las generaciones)
- ✅ **Mac Catalyst** (corre en Mac)


