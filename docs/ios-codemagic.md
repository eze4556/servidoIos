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

## Preparación de la siguiente compilación (cambios locales)

Se integró la pantalla Mi cuenta con confirmación de contraseña y eliminación de cuenta. El servidor cancela preapprovals de Mercado Pago verificando su titularidad antes de limpiar datos; elimina perfil, contenido propio, archivos y subcolecciones; conserva los registros necesarios de operaciones y un marcador mínimo de cuenta eliminada. Si falla un paso no devuelve éxito: la operación puede reintentarse. Los webhooks de suscripción no deben reactivar el perfil eliminado.

Se agregaron reportes y bloqueo en publicaciones, perfiles, historias, vivos y chat; gestión de bloqueos en Mi cuenta y una bandeja de Reportes de contenido para administradores. Las reglas impiden mensajes entre cuentas bloqueadas, protegen las listas privadas y aplican un filtro básico de texto. El filtro no analiza imágenes ni video: el equipo debe atender reportes y moderar el contenido de forma continua. Las APIs verifican también tokens revocados para impedir el uso de cuentas eliminadas o suspendidas.

Se retiró de las utilidades compartidas un módulo de cifrado Node sin consumidores. Ya no se incluyen los indicadores `createCipheriv` ni `aes-256-gcm` de ese módulo en el bundle estático verificado. Las declaraciones de cifrado de la nueva compilación deben revisarse sobre el binario y sus SDK; no reutilizar una respuesta sin verificar.

Validaciones realizadas con datos ficticios:

- `npm run test:release`: 12 pruebas de eliminación, renovaciones, titularidad, permisos y reportes.
- `npm run test:release:rules`: emuladores de Auth, Firestore y Storage en `demo-servido-release`; nunca usa datos de producción. Requiere Firebase CLI y Java 21.
- `node scripts/check-release-types.cjs`: comparación con HEAD, sin errores nuevos. El repositorio tiene 101 errores de TypeScript previos; Next actualmente omite la comprobación de tipos y lint al compilar.
- Build web completo usando `SERVIDO_WEB_BUILD_DIR=.release-web` para aislarlo de `.next`.
- Export estático de Capacitor y sincronización de iOS. La compilación nativa y las pruebas físicas del candidato aún no se realizaron.

Antes de generar y distribuir el próximo IPA:

1. Decisión del titular para esta presentación: mantener la contratación de planes de vendedor por Mercado Pago y explicar ese flujo a Apple. No se integraron compras de Apple ni se ocultarán funciones para la revisión. La aprobación de ese modelo queda a criterio de App Review.
2. Revisar los cambios locales y desplegar las reglas de Firestore/Storage y el backend. Las APIs `/api/account/delete`, `/api/safety/*` y `/api/admin/content-reports` corren en el servidor, no dentro del IPA. El build de Capacitor no las despliega.
3. Actualizar las declaraciones de privacidad y la política de retención con el titular del servicio según los datos efectivamente conservados. Los historiales de pedidos/pagos/reclamos no se eliminan indiscriminadamente.
4. En iPhone, probar contraseña errónea/correcta al eliminar, retry de una eliminación interrumpida, bloqueo en ambos sentidos, desbloqueo, reportes y su atención en el panel admin, notificaciones y todos los recorridos de pedidos. Los tests locales no sustituyen esas pruebas.
5. Recién entonces subir la nueva revisión y ejecutar Codemagic; mantener versión 1.0.0 y usar un número de compilación superior al 1. No se inició otra compilación en Codemagic ni se desplegaron estos cambios en producción durante esta preparación.


## Notas para App Review de la candidata

Pegar en las notas de revisión de App Store Connect, completando las cuentas de demostración en los campos privados correspondientes:

> Servido is a marketplace connecting buyers with merchants offering physical products, food and services. Purchases of physical products and food are processed through Mercado Pago.
>
> Seller subscription: merchants can purchase a recurring plan through Mercado Pago to enable publishing product/service listings and using seller tools. The iOS app currently includes this subscription flow; it does not use StoreKit for seller plans. This is separate from the checkout for physical goods.
>
> Please use the provided buyer and active seller demo accounts to review both experiences. The seller subscription is available from the seller profile subscription tab. Purchases and subscriptions use the live payment provider and may create real charges; the active seller demo account allows reviewing the unlocked features without making a payment.
>
> Account deletion is available from Mi cuenta and requires confirming the password and typing ELIMINAR. Reports and user blocking are available from content/profile/chat safety controls.

No enviar estas notas hasta comprobar en iPhone los recorridos y que la cuenta de vendedor de demostración tenga un plan activo. No incluir contraseñas en Git. La candidata agrega una comprobación en Codemagic que exige el backend v2 de Servido antes de generar el IPA.
