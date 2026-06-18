# ZAVALAEXPRESS - Apps nativas (Windows + Android)

Este proyecto ahora incluye empaquetado nativo para:

- Admin en PC: app de escritorio Windows (Electron).
- Mensajero en celular: app Android (Capacitor).

Ambas apps cargan la misma URL pública HTTPS del backend para operar en tiempo real por internet.

## 0) Requisito clave

Primero debes tener una URL pública del backend, por ejemplo:

`https://zavalaexpress.tudominio.com`

## 1) Configurar URL para ambas apps

### Desktop

Edita `desktop/config.json`:

```json
{
  "appUrl": "https://TU_DOMINIO_PUBLICO_AQUI"
}
```

### Mobile

Edita `mobile/capacitor.config.json`:

```json
{
  "server": {
    "url": "https://TU_DOMINIO_PUBLICO_AQUI"
  }
}
```

## 2) App Windows (Admin)

### Instalar dependencias

```powershell
cd desktop
npm install
```

### Probar en modo desarrollo

```powershell
npm start
```

### Generar instalable

```powershell
npm run dist
```

Salida esperada:

- `desktop/release/*.exe` (portable y/o instalador NSIS)

Si en tu Windows falla `npm run dist` por permisos de symlink (error de `winCodeSign`), usa este fallback inmediato para mañana:

```powershell
npm run bundle
```

Salida fallback:

- `desktop/release/ZAVALAEXPRESS-win32-x64/ZAVALAEXPRESS.exe`

Eso ya te permite entregar una app de escritorio ejecutable sin instalación tradicional.

## 3) App Android (Mensajero)

### Instalar dependencias

```powershell
cd mobile
npm install
```

### Crear proyecto Android (una sola vez)

```powershell
npm run add:android
```

### Sincronizar cambios

```powershell
npm run sync
```

### Abrir en Android Studio

```powershell
npm run open:android
```

Desde Android Studio:

1. Build > Build Bundle(s) / APK(s) > Build APK(s)
2. Toma el APK generado en `mobile/android/app/build/outputs/apk/`

## 4) Servidor para producción

Tu backend ya funciona con SQLite y API autenticada. Para operación real:

- servidor encendido 24/7
- URL pública con HTTPS
- backup programado de `backend/data/state.db`
- validar login/roles antes de salida final

## 5) Checklist de mañana

1. Definir URL pública del servidor.
2. Cambiar URL en `desktop/config.json` y `mobile/capacitor.config.json`.
3. Generar EXE de desktop.
4. Generar APK en Android Studio.
5. Probar login admin (PC) y mensajero (Android) al mismo tiempo.

## 6) Nota de permisos en Windows

Para que `electron-builder` genere instalador NSIS sin errores en algunos equipos, habilita:

- Modo Desarrollador de Windows, o
- Ejecutar terminal como administrador.
