# TODO.md — Fase 1: Estabilizar versión instalada

- [ ] Leer y ubicar puntos frágiles de autenticación/sync en el backend.
- [x] Corregir `requireAuth` para que el `userId` de la sesión se resuelva siempre correctamente.

- [x] Ajustar `POST /api/zavala/state` para que ante conflicto de `syncVersion` devuelva el estado actual (evitar bloqueo/manual reload).

- [x] Normalizar tipos críticos en la sincronización (especialmente `personas` y numéricos como `monto`, `fotoFinalReemplazos`).

- [x] Redeploy/build del backend (sin reinstalación del app).

- [x] Validar login admin y mensajero.
- [x] Validar creación/edición/finalización de servicios.
- [x] Validar sincronización entre dispositivos.


