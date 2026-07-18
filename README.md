# ZAVALAEXPRESS

Aplicación para gestionar servicios de mensajería de un despacho contable.

## Qué hace

- El administrador en PC crea servicios y asigna mensajeros.
- El mensajero en móvil revisa sus servicios, reporta el cierre y agrega foto de comprobante.
- El frontend puede funcionar en modo local-first usando IndexedDB y localStorage.
- Opcionalmente, puede sincronizar con un backend central mediante una API REST.

## Estructura principal

- `backend/`
  - Servidor Express que expone la API de estado.
  - `server.js` y `package.json`.
  - `backend/public/index.html` puede ser servido por el backend.
- `desktop/`
  - App de escritorio Electron para el admin.
  - Ajusta la URL en `desktop/config.json`.
- `mobile/`
  - App Android con Capacitor.
  - Ajusta la URL en `mobile/capacitor.config.json`.
- `ZAVALAEXPRESS(7).html`
  - Uno de los archivos frontend principales que se puede abrir en navegador.

## Qué incluye este repositorio

- `.render.yaml`
  - Configuración para desplegar `backend/` en Render como servicio web.
- `backend/server.js`
  - Backend Express con soporte local SQLite/JSON y opción para PostgreSQL via `DATABASE_URL`.
  - Soporta Firebase push si se configuran credenciales en variables de entorno.
- `backend/.env.example`
  - Ejemplo de variables de entorno para el backend.
- `backend/data/`
  - Estado local generado: `state.db`, `state.db-shm`, `state.db-wal`, `state.json`.
- `mobile/android/app/google-services.json`
  - Configuración de Firebase para Android.
- `desktop/config.json`
  - URL de backend para la app de escritorio.
- `mobile/capacitor.config.json`
  - URL del backend para la app Android.
- `check_deploy_state.js`, `check_live_auth.js`, `check_deploy_users.js`
  - Scripts que actualmente referencian la URL de Render para verificaciones.

## Render y Firebase en este proyecto

- `.render.yaml` está presente y apunta a `backend/`; esto es una configuración de despliegue, no una garantía de que el servicio ya esté activo.
- El backend puede ejecutarse localmente con `cd backend && npm install && npm start`.
- La base de datos local se guarda en `backend/data/` como SQLite/JSON.
- El backend también puede usar PostgreSQL si se define `DATABASE_URL`.
- El soporte de notificaciones push está implementado en `backend/server.js` usando Firebase Admin.
- Para que Firebase funcione se requiere una credencial de servicio, por ejemplo en:
  - `FIREBASE_SERVICE_ACCOUNT_JSON`
  - o `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
- La app móvil ya incluye `google-services.json`, lo que indica que hay configuración de Firebase para Android.

## Uso rápido

### 1. Ejecutar el backend

```bash
cd backend
npm install
npm start
```

La API disponible es:

- `GET /api/zavala/state`
- `POST /api/zavala/state`

### 2. Configurar el frontend web

Si quieres que la página use la API del backend, agrega esto en el HTML antes de cargar la app:

```html
<script>
  window.__ZAVALA_CONFIG__ = {
    apiBaseUrl: 'https://tu-servidor.com'
  };
</script>
```

La app intentará sincronizar con el servidor cuando `apiBaseUrl` esté definido.

### 3. Configurar la app de escritorio

Edita `desktop/config.json` para apuntar a la URL pública:

```json
{
  "appUrl": "https://TU_DOMINIO_PUBLICO"
}
```

### 4. Configurar la app Android

Edita `mobile/capacitor.config.json` y ajusta el bloque `server.url`:

```json
{
  "server": {
    "url": "https://TU_DOMINIO_PUBLICO"
  }
}
```

### 5. Generar APK (opcional)

```bash
cd mobile
npm install
npm run sync
npm run open:android
```

Luego arma el APK desde Android Studio.

## Notas importantes

- Si no hay backend configurado, la app funciona en modo local-first con datos guardados en el navegador.
- El backend actual es un avance funcional, no una solución final de producción.
- Para que móvil y escritorio compartan datos, ambos deben usar la misma URL pública del backend.
- Mantén HTTPS en producción.

## Qué revisar con el ingeniero

- `backend/` contiene la API y la versión que puede servir la interfaz.
- `desktop/` contiene la app de escritorio Electron.
- `mobile/` contiene la app Android Capacitor.
- El frontend HTML principal puede abrirse directamente o mediante el backend.
- `.render.yaml` indica que este repositorio está listo para desplegar `backend/` en Render.
- El backend usa `backend/data/` como almacenamiento local, y esa carpeta contiene datos de prueba/estado.
- `mobile/android/app/google-services.json` es la configuración de Firebase para Android.
- Si se necesita notificaciones push, el siguiente paso es agregar el service account de Firebase al backend.

## Limpieza realizada

- Se eliminaron todos los archivos `.md` excepto este `README.md`.
- Queda un único punto de entrada para la documentación necesaria.
