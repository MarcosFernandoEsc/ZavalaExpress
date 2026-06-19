# Preguntas para el contador (fácil de entender)

Estas preguntas son para que tú se las hagas al contador.
Si él no sabe, que se las pase tal cual al encargado de sistemas.

## Mensaje corto para el contador

"Necesito estos datos para que la app del admin (PC) y la app del mensajero (celular) funcionen conectadas por internet. ¿Me ayudas a conseguirlos con el encargado de sistemas?"

## Preguntas (en orden)

1. ¿Cuál es la dirección exacta de la app en internet?
   - Ejemplo: https://zavala.empresa.com
   - Si no hay dominio, pedir IP pública completa.

2. ¿Esa dirección abre también desde fuera de la oficina?
   - Que lo prueben con un celular usando datos móviles (no WiFi de la empresa).

3. ¿La dirección empieza con https://?
   - Si es sí, perfecto.
   - Si es no, también me sirve saberlo, pero hay que ajustarlo.

4. ¿El servidor está encendido todo el tiempo (24/7)?
   - Si lo apagan en la noche, la app dejará de funcionar en ese horario.

5. Si el sistema se cae, ¿quién lo reinicia?
   - Necesito nombre y teléfono de esa persona.

6. ¿Qué puerto usa el sistema?
   - Si no saben, pedir que el encargado lo confirme (ejemplo: 443, 3000, 8080).

7. ¿Ya tienen respaldo (backup) de la base de datos?
   - Si sí: cada cuánto y quién lo revisa.
   - Si no: pedir que lo activen.

## Lo mínimo que te deben regresar

Copia y pega este formato para que te respondan:

- URL final: ________
- ¿Abre desde datos móviles?: Sí / No
- ¿Usa HTTPS?: Sí / No
- ¿Está prendido 24/7?: Sí / No
- Responsable técnico (nombre y teléfono): ________
- Puerto: ________
- ¿Tiene backup?: Sí / No

## Importante

Con esos datos ya se puede dejar funcionando:
- App de PC (admin)
- App de celular (mensajero)

Sin esos datos, las apps pueden abrir, pero no compartir información entre Chiapas y CDMX.
