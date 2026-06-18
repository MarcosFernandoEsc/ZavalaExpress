# ZAVALAEXPRESS

Aplicación web para control de servicios de mensajería de un despacho contable.

## Flujo principal

- El contador usa la app en PC para crear servicios.
- Selecciona el mensajero/Uber asignado.
- Registra fecha, hora, lugares o personas a visitar e importe.
- El mensajero usa la app en móvil para revisar sus servicios.
- Al terminar, el mensajero finaliza el servicio con reporte y foto de comprobante.

## Estado de la app

La app funciona en modo local-first:

- Guarda datos en IndexedDB.
- Usa localStorage como respaldo.
- Si se define un servidor, también intenta sincronizar el estado con una API.

## Configuración de servidor

El HTML espera, de forma opcional, esta configuración global:

```html
<script>
  window.__ZAVALA_CONFIG__ = {
    apiBaseUrl: 'https://tu-servidor.com'
  };
</script>
```

Cuando `apiBaseUrl` está disponible, la app intenta usar:

- `GET /api/zavala/state`
- `POST /api/zavala/state`

### Formato esperado

La API debe devolver y aceptar el mismo objeto JSON interno que usa la app.

## Recomendación de despliegue

- Publicar el HTML en el servidor corporativo.
- Asegurar HTTPS.
- Conectar la API de estado antes de mover la operación a producción.
- Probar primero con datos de ejemplo y después con datos reales.

## Próximos pasos sugeridos

1. Separar frontend y backend en archivos distintos.
2. Crear autenticación real para contador y mensajeros.
3. Guardar fotos en almacenamiento de servidor en lugar de local.
4. Agregar historial de cambios y auditoría centralizada.

## Apps nativas (Windows + Android)

Se agregó guía rápida para empaquetar aplicaciones descargables:

- `NATIVE_APPS_QUICKSTART.md`
- `desktop/` (Electron para admin en PC)
- `mobile/` (Capacitor Android para mensajero)

## Para ir a la empresa (Chiapas)

Antes de salir:
- Lee: `CHECKLIST_EMPRESA.md` (qué preguntar al admin)
- Lleva: este proyecto en tu USB/laptop

Cuando regreses:
- Lee: `ENTREGA_FINAL.md` (pasos paso a paso para configurar)
- Ejecuta: `update-url.bat` (Windows) o `update-url.sh` (Linux/Mac) con tu URL
- Entregar: `ZAVALAEXPRESS.exe` (admin) + `app-debug.apk` (mensajero)
