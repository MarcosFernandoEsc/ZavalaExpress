# Entrega final ZAVALAEXPRESS - Guía lista para mañana

Cuando regreses de la empresa con la URL, sigue estos pasos **en orden**:

---

## PASO 1: Obtener URL del servidor

De tu visita a la empresa tendrás algo como:
```
https://zavala.empresa.com
o
https://200.123.45.67:3000
o
https://mi-dominio.com
```

**Nota la URL exacta.**

---

## PASO 2: Configurar URL en app de escritorio (Admin PC)

1. Abre archivo: `desktop/config.json`
2. Reemplaza `https://TU_DOMINIO_PUBLICO_AQUI` con tu URL real
3. Ejemplo:
   ```json
   {
     "appUrl": "https://zavala.empresa.com"
   }
   ```
4. Guarda el archivo

---

## PASO 3: Configurar URL en app Android (Mensajero)

1. Abre archivo: `mobile/capacitor.config.json`
2. Reemplaza `https://TU_DOMINIO_PUBLICO_AQUI` en la sección `server.url` con tu URL real
3. Ejemplo:
   ```json
   {
     "server": {
       "url": "https://zavala.empresa.com"
     }
   }
   ```
4. Guarda el archivo

---

## PASO 4: Entregar app de escritorio al admin

1. Ve a carpeta: `desktop/release/ZAVALAEXPRESS-win32-x64/`
2. Busca el archivo: `ZAVALAEXPRESS.exe`
3. Dile al admin: "Descarga este archivo, lo pone en su PC, lo abre y listo"
4. Cuando abra:
   - Verá interfaz ZAVALAEXPRESS
   - Se conectará automáticamente a la URL que configuraste
   - Puede crear servicios
   - Los cambios se guardan en el servidor

---

## PASO 5: Compilar APK para Android (Mensajero)

Ejecuta en terminal:

```powershell
cd mobile
npm install
npm run sync
npm run open:android
```

En Android Studio:
1. Espera a que cargue todo
2. Menú: `Build` > `Build Bundle(s) / APK(s)` > `Build APK(s)`
3. Espera a que compile (5-10 min)
4. Localiza el APK:
   - Busca carpeta: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`
5. Cópialo a una carpeta accesible

---

## PASO 6: Entregar APK al mensajero

1. Transfiere el archivo `app-debug.apk` al celular del mensajero (por email, USB, etc.)
2. Abre el archivo en el celular
3. Android pedirá instalar
4. Aceptar + instalar
5. Cuando abra:
   - Verá interfaz ZAVALAEXPRESS
   - Se conectará a la misma URL
   - Verá los servicios del admin en tiempo real

---

## PASO 7: PRUEBA EN VIVO

**Admin (Chiapas):**
1. Abre `ZAVALAEXPRESS.exe`
2. Login: usuario = `admin`, contraseña = `1234`
3. Crea un servicio (rellena datos, guarda)

**Mensajero (CDMX):**
1. Abre app (APK instalado)
2. Login: usuario = `demo`, contraseña = `1234`
3. Recarga pantalla (si es necesario)
4. **Debe ver el servicio que creó el admin ✅**
5. Termina el servicio, agrega foto
6. Admin debe verlo actualizado ✅

---

## CREDENCIALES DE PRUEBA

| Rol | Usuario | Contraseña |
|-----|---------|-----------|
| Admin | `admin` | `1234` |
| Mensajero | `demo` | `1234` |

---

## Si algo falla

### El mensajero no ve los servicios
- Verifica URL en `mobile/capacitor.config.json` sea idéntica a la del desktop
- Confirma que ambos tengan conexión a internet
- Reinicia la app en el celular

### Admin no se conecta
- Verifica URL en `desktop/config.json`
- Prueba la URL en navegador del admin PC para ver si es accesible
- Si no, es problema de la URL o servidor, contacta IT

### Servidor no responde
- Verifica que el backend en la PC servidor esté corriendo
- Comando en servidor: `cd backend && npm start`

---

## RESUMEN RÁPIDO

1. Anota URL de empresa
2. Cambia URL en `desktop/config.json`
3. Cambia URL en `mobile/capacitor.config.json`
4. Entregar `ZAVALAEXPRESS.exe` al admin
5. Compilar y entregar `app-debug.apk` al mensajero
6. Ambos loguearse y probar

**Listo.** 🚀
