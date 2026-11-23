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

## Preparación de la siguiente compilación

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
2. Reglas de Firestore/Storage desplegadas el 22/11/2026 en `servidodb-a1eda` con `servido.interno@gmail.com`. Backend desplegado en el proyecto Vercel `servido`, scope `ezequiels-projects-80a1c30f`, y verificado en `https://www.servido.com.ar` mediante comprobaciones sin sesión ni modificaciones de datos. Las APIs `/api/account/delete`, `/api/safety/*` y `/api/admin/content-reports` corren en el servidor, no dentro del IPA. El build de Capacitor no las despliega.
3. Actualizar las declaraciones de privacidad y la política de retención con el titular del servicio según los datos efectivamente conservados. Los historiales de pedidos/pagos/reclamos no se eliminan indiscriminadamente.
4. En iPhone, probar contraseña errónea/correcta al eliminar, retry de una eliminación interrumpida, bloqueo en ambos sentidos, desbloqueo, reportes y su atención en el panel admin, notificaciones y todos los recorridos de pedidos. Los tests locales no sustituyen esas pruebas.
5. Generar el IPA candidato en Codemagic manteniendo versión 1.0.0 y un número de compilación superior al 1. La revisión `e07ae59` se subió a GitHub y el build `6b02e60d8f52ca27512a1cb2` terminó correctamente el 22/11/2026 en 7m 37s. El registro de publicación confirmó `UPLOAD SUCCEEDED`, versión 1.0.0 (2), bundle `ar.com.servido.app`, delivery UUID `2033034d-7014-4acb-beb3-d92811beaf54`. Apple emitió solamente una advertencia de SDK para futuras cargas desde abril de 2027. Falta comprobar el procesamiento en TestFlight y realizar las pruebas físicas. No se envió esta candidata a App Review. Las pruebas físicas del punto anterior deben completarse con el nuevo IPA antes de distribuirlo o enviarlo a revisión.


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


## Actualización de ficha y privacidad - 22/11/2026

- App verificada mediante API oficial: Servido, `6836551431`, `ar.com.servido.app`, issuer esperado.
- Contacto de revisión guardado con los datos proporcionados por el titular; no incluye credenciales de prueba en Git.
- Disponibilidad verificada: únicamente Argentina (`ARG`), sin preventa ni incorporación automática de territorios. Descarga gratuita, territorio base ARG.
- Privacidad ES/PT actualizada con Firebase/APNs, Vercel, Mercado Pago, LiveKit, Resend y OpenAI; datos de cobro y cadetes, contenido compartido, retención de operaciones y eliminación de cuenta.
- Condiciones actualizadas con la prohibición confirmada de alcohol, tabaco, drogas, armas y contenido adulto.
- Sitio desplegado en `servido` / `ezequiels-projects-80a1c30f`, despliegue `dpl_SDD616MJm3KWYBSk7WvWmxxdSS5U`.
- Se añadió `ITSAppUsesNonExemptEncryption=false` para reflejar el uso de cifrado exento de transporte/plataforma del cliente auditado. Revisar esta declaración si cambian dependencias o funciones criptográficas.
- La guía para el cliente está en `output/pdf/Servido_Guia_TestFlight_y_Capturas.pdf` (archivo local excluido del despliegue y de Git).
- Pendientes antes de App Review: capturas originales, cuenta demo válida, completar/finalizar declaraciones de privacidad en la UI, titular de copyright y pruebas físicas. La nueva compilación debe incorporar las políticas actualizadas.


## Cierre de privacidad y compilación 3 - 23/11/2026

- Copyright confirmado por el titular y verificado en App Store Connect: `2026 Daniel Zacarias Galinger`.
- Declaración de privacidad finalizada para 16 tipos de datos: finalidad funcionalidad de la app, vinculados a la identidad y sin seguimiento entre apps. Publicada en App Store Connect tras confirmación explícita del titular del aviso de exactitud y cumplimiento de Apple.
- Cuenta demo facilitada por el titular validada y guardada únicamente en los campos privados de App Review, tras autorización expresa. Su perfil actual es vendedor sin plan activo; falta una demo con plan activo para herramientas restringidas. No almacenar la contraseña en Git.
- Codemagic: build 3 `6b045c567fd2f1388ef3bb41`, rama `main`, revisión `d6abf56`, workflow `Servido iOS - TestFlight`, cuenta `servido.interno@gmail.com`. Estado observado: waiting, aún sin máquina asignada. No se creó otra ejecución duplicada.
- No se envió la app a App Review. Siguen pendientes capturas originales y pruebas físicas.


### Reintento por asignación de máquina

El build 3 permaneció en waiting durante más de 15 minutos sin asignación de Mac, con 13/500 minutos consumidos y sin otras ejecuciones activas. Se fija Xcode 26.5, imagen oficialmente soportada para M2; Codemagic ha recomendado esta alternativa para saturación del pool de Xcode latest en https://github.com/orgs/codemagic-ci-cd/discussions/3570. No implica garantía de disponibilidad inmediata. Se detendrá la ejecución pendiente antes de iniciar un único reintento.
