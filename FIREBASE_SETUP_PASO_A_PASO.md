# Firebase paso a paso (ZAVALAEXPRESS)

Objetivo: generar estos 2 elementos para push con app cerrada:

1. `mobile/android/app/google-services.json`
2. Credencial de Service Account para backend (JSON o variables env)

## A) Crear proyecto Firebase

1. Abre https://console.firebase.google.com
2. Click en Crear proyecto.
3. Nombre sugerido: `zavalaexpress-prod`.
4. Puedes desactivar Google Analytics (no es obligatorio para push).
5. Crear proyecto.

## B) Registrar app Android y descargar google-services.json

1. Dentro del proyecto Firebase, click en icono Android.
2. Android package name:
- `com.zavalaexpress.mobile`
3. App nickname: `ZAVALAEXPRESS Mobile`.
4. SHA-1: opcional para FCM (puedes dejarlo vacio hoy).
5. Registrar app.
6. Descargar `google-services.json`.
7. Copia ese archivo en:
- `mobile/android/app/google-services.json`

## C) Habilitar Cloud Messaging (FCM)

1. En Firebase Console, entra a Project Settings.
2. Tab Cloud Messaging.
3. Verifica que Firebase Cloud Messaging API este habilitada.

## D) Generar Service Account JSON para backend

1. En Firebase Console: Project Settings -> Service accounts.
2. Click en Generate new private key.
3. Se descarga un JSON (ej. `zavalaexpress-prod-firebase-adminsdk-xxxx.json`).
4. NO subir este archivo a GitHub.

## E) Configurar backend con credencial Firebase

Tienes dos opciones:

## Opcion 1 (recomendada): variable unica

1. Abre el JSON descargado.
2. Conviertelo a una sola linea (sin saltos) o escapando `\n` en private_key.
3. Crea variable de entorno en servidor:
- `FIREBASE_SERVICE_ACCOUNT_JSON=<json completo>`

## Opcion 2: 3 variables separadas

1. Toma del JSON:
- `project_id`
- `client_email`
- `private_key`
2. Configura variables:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (saltos como `\n`)

Referencia de formato en [backend/.env.example](backend/.env.example).

## F) Probar en Android

1. Desde proyecto:

```powershell
cd mobile
npm install
npm run sync
npm run open:android
```

2. En Android Studio: Build APK e instala en celular del mensajero.
3. Abre app, inicia sesion con usuario mensajero.
4. Acepta permiso de notificaciones.
5. Desde PC admin crea un servicio al mensajero.
6. Debe llegar push incluso con app cerrada.

## G) Datos que necesito de ti para terminarlo yo

Si quieres que yo te deje todo cerrado en cuanto tengas acceso al servidor, necesito:

1. Acceso SSH o AnyDesk al servidor 24/7.
2. El archivo `google-services.json`.
3. El Service Account JSON (o que tu lo cargues como variables env).
4. Confirmar subdominio final de API (ideal: `https://api.zavalacorp.com.mx`).

Con eso te dejo deploy final, variables, arranque automatico y prueba de push end-to-end.
