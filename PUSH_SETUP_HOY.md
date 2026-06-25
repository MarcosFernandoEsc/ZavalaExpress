# ZAVALAEXPRESS - Cierre hoy (PC + Android con push real)

Este proyecto ya quedo preparado para:

- App de PC (Electron) usando la misma interfaz actual.
- App Android (Capacitor) usando la misma interfaz actual.
- Backend con soporte para push nativo via Firebase (FCM).
- Registro de token del mensajero y envio de push por asignacion/recordatorios.

## Lo que SI ya esta implementado

1. Backend guarda y sirve estado compartido (admin en Chiapas / mensajero en CDMX).
2. Backend expone endpoints push:
- `POST /api/zavala/push/register`
- `POST /api/zavala/push/unregister`
3. Backend envia push cuando hay servicio nuevo/reasignado.
4. Backend corre recordatorios automaticos cada minuto (2 dias, 1 dia, 3 horas, vencido).
5. Android tiene permiso de notificaciones y plugin push integrado.

## Lo que falta para que funcione al 100% (obligatorio)

## 1) Servidor estable 24/7 (NO free tier que duerma)

Necesitas uno de estos hoy:

- VPS (recomendado): Contabo, Hetzner, DigitalOcean.
- PaaS pago con instancia siempre encendida y disco persistente.

Requisitos minimos:

- Node.js 20+
- Disco persistente (para `backend/data/state.db`)
- HTTPS con dominio

## 2) Firebase para push en app cerrada

Necesitas estos datos/archivos:

1. Proyecto Firebase creado.
2. App Android registrada con package:
- `com.zavalaexpress.mobile`
3. Archivo `google-services.json` dentro de:
- `mobile/android/app/google-services.json`
4. Credenciales de Service Account para backend (JSON o variables de entorno).

Variables de entorno backend (si no usas JSON completo):

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (con `\n` escapado)

Alternativa:

- `FIREBASE_SERVICE_ACCOUNT_JSON` con todo el JSON en una sola variable.

## 3) URL publica final

Define una sola URL HTTPS para backend, por ejemplo:

- `https://api.tuempresa.com`

Luego actualiza wrappers:

- `desktop/config.json` -> `appUrl`
- `mobile/capacitor.config.json` -> `server.url`

Puedes usar:

- `update-url.bat https://api.tuempresa.com`

## 4) Compilar apps finales

### Desktop (admin)

```powershell
cd desktop
npm install
npm run dist
```

Fallback si falla builder:

```powershell
npm run bundle
```

### Android (mensajero)

```powershell
cd mobile
npm install
npm run sync
npm run open:android
```

Luego en Android Studio -> Build APK.

## Checklist de pruebas obligatorias (hoy)

1. Admin (PC) crea servicio para mensajero.
2. Mensajero (Android) lo ve en segundos.
3. Con app Android cerrada, llega push de asignacion.
4. Cambiar hora de servicio para forzar recordatorio y validar push.
5. Mensajero finaliza servicio, admin ve cambio.

## Si hoy quieres salir en 2 horas, necesito de tu lado

1. Dominio/subdominio que se usara (ejemplo `api.tuempresa.com`).
2. Acceso al servidor donde se desplegara backend.
3. Archivo `google-services.json` de Firebase Android.
4. Service Account JSON de Firebase para backend.

Con eso se puede cerrar deploy real hoy sin cambiar la apariencia actual.
