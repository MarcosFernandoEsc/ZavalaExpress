# Backend de avance - ZAVALAEXPRESS

Este backend es una entrega parcial para presentar progreso del proyecto.

## Qué hace

- Expone `GET /api/zavala/state` para leer el estado general.
- Expone `POST /api/zavala/state` para guardar el estado completo.
- Guarda la información en `backend/data/state.db` usando SQLite.
- Mantiene una copia de respaldo JSON en `backend/data/state.json`.
- Está pensado para conectar con el HTML existente de ZAVALAEXPRESS.

## Estructura

- `server.js`: servidor Express.
- `data/state.json`: almacenamiento simple del avance.
- `package.json`: dependencias y scripts.

## Cómo ejecutarlo

```bash
cd backend
npm install
npm run start
```

## Observación importante

Esto no es todavía el backend final de producción. Sirve para demostrar la ruta correcta del sistema y dejar lista la integración con servidor real más adelante.

## Cómo preparar esto para un servidor real

Tu backend ahora también puede servir la interfaz desde `backend/public/index.html`. Eso significa que si publicas el backend completo en un servicio como Render o Railway, tanto la página como la API pueden vivir en el mismo lugar.

1. Sube la carpeta `backend` al servicio.
2. Asegúrate de correr `npm install` y `npm start`.
3. Si el servicio te da una URL pública como `https://mi-zavala-app.onrender.com`, abre esa URL en el navegador.
4. La página web se cargará y usará la misma URL para la API automáticamente.

### ¿Es suficiente para PC y celular?

Sí, siempre que ambos usen la misma URL pública del servidor.

- El repartidor en Ciudad de México y Zavala en Chiapas no necesitan estar cerca.
- Lo importante es que ambos accedan al servidor por internet.
- El servidor guarda `backend/data/state.json` y ese archivo será la base de datos compartida.

### Sobre Render y Railway

Ambos ofrecen opciones gratuitas para hacer pruebas y demos:

- Render tiene un plan gratuito para servicios web Node.js.
- Railway ofrece crédito gratuito y puede correr tu servidor Node.js.

Las limitaciones suelen ser:

- El servicio puede dormir después de un tiempo sin uso.
- Hay un límite de horas o crédito mensual.
- Para un proyecto de prueba o demostración, generalmente es suficiente.

### Despliegue recomendado en Render

Render es más sencillo para esto y permite que la app y la API estén juntas.

1. Crea una cuenta en https://render.com.
2. En el tablero, crea un nuevo "Web Service".
3. Elige "Node" como tipo de servicio.
4. Conecta tu repositorio o sube los archivos del backend.
5. Asegúrate de que el directorio raíz del servicio sea `backend`.
6. El comando de build no es necesario.
7. El comando de start debe ser:

```bash
npm install
npm start
```

8. Render te dará una URL como `https://mi-zavala-app.onrender.com`.
9. Abre esa URL en tu navegador. Si todo está bien, verás tu app y la API funcionará.

### Si no quieres usar el mismo servidor para HTML y API

Si prefieres mantener la página en tu PC o abrirla desde otro host, configura en `ZAVALAEXPRESS(7).html`:

```js
window.__ZAVALA_CONFIG__ = {
  apiBaseUrl: 'https://mi-zavala-app.onrender.com'
};
```

En ese caso, la página y el backend pueden estar en orígenes diferentes, pero ambos deben poder conectarse a la API pública.

### Nota final

Para que esto funcione de verdad:

- el backend debe estar desplegado en internet
- el frontend debe abrirse desde una URL HTTP(S)
- ambos dispositivos deben usar la misma URL pública del backend
