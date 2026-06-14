# Despliegue en Render

Esta aplicación puede publicarse en Render como un servicio web Node.js. El backend está listo para servir la interfaz y la API desde la misma URL.

## Pasos rápidos

1. Crea un repositorio en GitHub con tu proyecto.
2. Asegúrate de que la rama principal se llame `main`.
3. Empuja tu proyecto al repositorio.

```bash
cd "c:\Users\marqu\OneDrive\Documentos\ZAVALA"
git init
git add .
git commit -m "Primer deploy a Render"
git branch -M main
# reemplaza con tu URL real
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

4. Entra a https://render.com y crea una cuenta.
5. Crea un nuevo "Web Service".
6. Selecciona el repositorio que acabas de crear.
7. Deja el servicio como Node, y Render usará el archivo `.render.yaml` para configurar lo siguiente:
   - directorio raíz: `backend`
   - comando de build: `npm install`
   - comando de start: `npm start`
8. Despliega.

## Qué hace `.render.yaml`

Render usará este archivo en la raíz del repo para configurar el servicio automáticamente. Define:

- nombre del servicio: `zavalaexpress-backend`
- entorno: Node
- plan: gratuito
- directorio raíz: `backend`
- comando de build: `npm install`
- comando de inicio: `npm start`

## Cómo verificarlo

Una vez desplegado, Render te dará una URL pública como:

```text
https://zavalaexpress-backend.onrender.com
```

Abre esa URL en tu navegador del celular y la PC. Si todo está bien, verás la app y podrás usarla como si fuera un servidor compartido.

## Nota sobre la interfaz

El backend ya sirve la app desde `backend/public/index.html`, de modo que no necesitas subir otro HTML separado.

## Si no quieres usar GitHub

Render necesita un repositorio para desplegar. Si no estás familiarizado con GitHub, pide apoyo a alguien de la oficina para crear el repo y subir el código.

## Si necesitas revisar desde el celular

- Abre la URL pública que Render te dé.
- El app debe verse igual que en tu navegador de PC.
- Los datos se almacenarán en `backend/data/state.json` en el servidor Render.

## Qué sigue

- Si quieres, te ayudo a preparar el repo de GitHub y confirmarte los pasos finales.
