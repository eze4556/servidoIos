# Servido iOS con Codemagic

## Preparado en este repositorio

- Proyecto iOS de Capacitor 8, CocoaPods, mínimo iOS 15; Bundle ID `ar.com.servido.app`.
- Versión inicial 1.0.0; esquema compartido `App` para compilar sin abrir Xcode.
- Permisos de cámara, micrófono, fotos y ubicación al usar la app.
- Ícono sin transparencia de 1024 px y splash generados desde `public/images/logo.png`.
- AppDelegate integra Firebase Messaging: conecta el token APNs y entrega un token **FCM** a Capacitor. El backend existente envía por FCM.
- Entitlement de push; Codemagic aplica el perfil de distribución correspondiente al exportar.
- Workflow manual `ios-testflight` en `codemagic.yaml`. Genera un IPA firmado y lo carga en App Store Connect. No envía a revisión pública ni a revisión beta externa. Los testers internos se asignan en App Store Connect.

La compilación nativa, la resolución de CocoaPods y el funcionamiento en iPhone todavía deben verificarse en la primera corrida de Codemagic. Windows no ejecuta Xcode. Después de la primera resolución exitosa, conservar `ios/App/Podfile.lock` en Git para fijar las dependencias nativas.

## 1. Apple Developer y App Store Connect

En el equipo del cliente:

1. Registrar el identificador explícito `ar.com.servido.app` y habilitar **Push Notifications** antes de crear el perfil.
2. Crear la ficha de Servido en App Store Connect usando ese identificador.
3. Crear una API key dedicada a Codemagic en Usuarios y acceso → Integraciones → App Store Connect API. Registrar Key ID e Issuer ID y guardar el archivo `.p8`.
4. En Codemagic → Team integrations → Developer Portal, agregar esa API key con el nombre exacto **`servido-apple`**. Si se usa otro nombre, cambiar `integrations.app_store_connect` en el YAML.
5. En Code signing identities, generar o cargar un certificado **Apple Distribution** y cargar/obtener un perfil **App Store** para Servido, con push habilitado y del mismo equipo. El YAML selecciona por Bundle ID y tipo `app_store`.

Documentación oficial: https://docs.codemagic.io/yaml-code-signing/signing-ios/

## 2. Firebase iOS y APNs

1. En el mismo proyecto Firebase que usa la web, registrar una aplicación **iOS**, Bundle ID `ar.com.servido.app`.
2. Descargar su `GoogleService-Info.plist`. El `GOOGLE_APP_ID` de iOS es distinto del App ID de la aplicación web: no reemplazar `NEXT_PUBLIC_FIREBASE_APP_ID` por el de iOS.
3. En Apple Developer, crear una clave APNs con acceso a la app. Cargarla en Firebase → Configuración del proyecto → Cloud Messaging → aplicación iOS, junto con Key ID y Team ID. La clave APNs es distinta de la API key de App Store Connect.
4. Convertir el plist a Base64 y guardarlo como variable secreta `GOOGLE_SERVICE_INFO_PLIST_BASE64` en el grupo de Codemagic **`servido_ios`**.

En PowerShell, desde la carpeta donde esté el plist:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path './GoogleService-Info.plist'))) | Set-Clipboard
```

Pegar el resultado directamente en Codemagic. El workflow crea el archivo al compilar y comprueba Bundle ID, proyecto y sender ID. El archivo está excluido de Git; debe incluirse en los recursos del binario, como ya está configurado en Xcode.

Documentación oficial: https://firebase.google.com/docs/cloud-messaging/ios/get-started

## 3. Variables de la aplicación

Crear el grupo **`servido_production`** en Codemagic y cargar los valores de producción:

- `NEXT_PUBLIC_APP_URL` o `NEXT_PUBLIC_API_BASE_URL`: backend HTTPS de Servido.
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`: App ID de Firebase **web**, utilizado por el frontend.
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL` y `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` si están en uso.
- Otras variables públicas `NEXT_PUBLIC_*` que utilice la web en producción.

Las variables `NEXT_PUBLIC_*` quedan incluidas en la aplicación: no colocar secretos del servidor en ellas. Las credenciales de Firebase Admin, Mercado Pago y Resend permanecen en el backend; no copiar todo `.env.local` a Codemagic.

## 4. Primera compilación

1. Subir al repositorio estos cambios junto con las funciones pendientes que deba incluir la app. Revisar los cambios existentes antes de hacer commit.
2. Conectar el repositorio en Codemagic y elegir configuración mediante YAML.
3. Configurar la integración de Apple, certificado/perfil y ambos grupos de variables.
4. Ejecutar manualmente **Servido iOS - TestFlight**.
5. Descargar el IPA si hace falta y comprobar la compilación procesada en App Store Connect → TestFlight. Completar allí las declaraciones de exportación si Apple las solicita.
6. Agregar testers internos e instalar en un iPhone con TestFlight.

El número de compilación usa `BUILD_NUMBER + IOS_BUILD_OFFSET`. Empieza con offset 0; si ya existen builds con un número mayor o se recrea el workflow, aumentar el offset en el YAML para que cada carga tenga un número superior. La versión comercial se cambia en `MARKETING_VERSION` del proyecto Xcode.

La instalación usa `npm ci --legacy-peer-deps` porque el lockfile actual tiene conflictos de peers previos (React y AI SDK). No se actualizaron esas dependencias como parte de iOS. Para este workflow usar `package-lock.json`; no mezclar instalaciones de pnpm.

Documentación oficial: https://docs.codemagic.io/yaml-quick-start/building-an-ionic-app/ y https://docs.codemagic.io/yaml-publishing/app-store-connect/

## 5. Verificación en iPhone antes de revisión

- Registro, login y persistencia de sesión; cerrar sesión y cambiar de cuenta.
- Eliminar cuenta desde la app y comprobar el resultado en el backend.
- Navegar a productos, chats y paneles, volver atrás y abrir enlaces de notificaciones.
- Elegir imágenes, cámara, fotos y transmisión en vivo con audio. Probar aceptar y rechazar permisos.
- Ubicación para direcciones y cadetes con la app abierta; probar permisos denegados.
- Push con la app abierta, en segundo plano y cerrada; comprobar que no llegan notificaciones de la cuenta anterior después del logout.
- Pedidos, Mercado Pago y regreso desde el pago; confirmar que no se pierde la sesión.
- Safe areas, teclado y vistas de iPad si se mantiene soporte para iPad.

## Pendientes funcionales y de revisión

**Ubicación del cadete en segundo plano:** el seguimiento actual usa `navigator.geolocation` y temporizadores del WebView. No garantiza actualizaciones con el iPhone bloqueado. Por eso no se declara `UIBackgroundModes=location` ni se promete seguimiento continuo. Para ofrecerlo hace falta implementar y probar un servicio nativo de ubicación, su ciclo de vida y el flujo de permisos. La descripción Always está presente porque la requiere el plugin de Geolocation, pero no se solicita acceso permanente desde este cambio.

**Suscripciones de vendedores:** revisar el flujo de suscripción cobrada por Mercado Pago antes de la revisión pública, porque habilita funciones de publicación dentro de la plataforma. Evaluar su tratamiento según las reglas vigentes de compras integradas. No se cambió el sistema de cobro. Las compras de bienes físicos son un flujo diferente.

**Ficha de App Store:** completar privacidad según los datos realmente tratados por la app y los SDK, política de privacidad, soporte, capturas, clasificación y cuentas de demostración. Verificar los manifiestos de privacidad incluidos por los SDK en el archivo generado. La existencia de permisos no reemplaza esas declaraciones.

## Comandos locales

```text
npm run ios:assets
npm run ios:check
npm run cap:sync:ios
```

En Windows, `cap sync ios` copia assets y actualiza plugins, pero puede advertir que no hay CocoaPods/Xcode; la instalación de pods y compilación se completan en Codemagic. No volver a ejecutar `cap add ios`: el proyecto ya existe.
