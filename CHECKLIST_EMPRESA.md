# Checklist para visita a empresa (Chiapas)

Cuando vayas a la empresa mañana, pregunta esto al admin/responsable del servidor:

## 1) **URL / Dominio del servidor**
   - **Pregunta**: "¿Cuál es la URL pública o dominio que usan para acceder al servidor desde fuera?"
   - **Espera respuesta como**: `https://mi-empresa.com` o `https://zavala.midominio.com`
   - **Si no saben**: "¿Qué IP pública tiene la PC del servidor?"

## 2) **Puerto**
   - **Pregunta**: "¿En qué puerto está corriendo el servidor? ¿3000? ¿8080?"
   - **Respuesta típica**: 3000, 8080, o está detrás de reverse proxy en puerto 80/443
   - **Si dice "no sé"**: Asume puerto 3000, pero confirma con IT

## 3) **HTTPS vs HTTP**
   - **Pregunta**: "¿El servidor tiene certificado SSL/HTTPS?"
   - **Respuesta esperada**: Sí (tiene dominio + certificado) o No (usa HTTP)
   - **Importante**: Las apps modernas prefieren HTTPS; si es HTTP debes saberlo para configuración

## 4) **¿El servidor está encendido siempre?**
   - **Pregunta**: "¿Qué tan confiable es? ¿Se reinicia solo? ¿Alguien lo apaga?"
   - **Respuesta**: Define si la app va a ser estable para operación diaria

## 5) **Acceso para instalar/reiniciar**
   - **Pregunta**: "¿Quién tiene acceso a la PC servidor? ¿Yo puedo instalar cosas o solo IT?"
   - **Por qué**: Si algo falla, necesitas saber quién reinicia o actualiza

## 6) **Documento/contrato**
   - **Pide**: Que confirmen por email o documento que autorizan usar esa URL para la app

---

## Ejemplo de respuesta "perfecta"

```
URL: https://zavala.empresa.com
Puerto: 443 (detrás de dominio, sin puerto visible)
HTTPS: Sí, tiene certificado válido
Disponibilidad: Abierta 24/7, IT maneja reinicio automático
```

## Ejemplo de respuesta "difícil"

```
IP: 200.123.45.67
Puerto: 3000
HTTPS: No, es HTTP (esto requiere ajuste en app)
Disponibilidad: Se apaga a las 9 PM, reinicia a las 8 AM
```

---

## Qué hacer después

1. Anota la URL/dominio exacto que te den
2. Vuelve a casa
3. Envíame un mensaje: "La URL es `[URL_AQUI]`"
4. Yo configuro todo en las apps
5. Genero APK + listo

---

## Si todo falla / no tienen nada

Dile que necesitan:
1. Una PC que esté siempre encendida
2. Una URL pública (puede ser dominio propio o IP fija)
3. Certificado HTTPS (recomendado)

Si NO tienen nada: propón desplegar en **Render** (gratis para prueba), te doy costo 0 y listo en 15 min.
