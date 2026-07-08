# TODO_FASE2_WORKFLOW.md

- [x] Paso 1: Revisión de implementación actual en `backend/server.js` para detectar riesgos de compatibilidad en `POST /api/zavala/state`.
- [x] Paso 2: Implementar merge seguro en `POST /api/zavala/state` para colecciones adicionales (además de `usuarios`) y aplicar normalización defensiva consistente.
- [x] Paso 3: Asegurar que el guardado `saveState()` no elimine datos por campos faltantes (mantener valores actuales cuando el cliente no envía el campo).

- [ ] Paso 4: Smoke tests locales: arrancar backend y validar:
  - login admin
  - GET `/api/zavala/state`
  - POST `/api/zavala/state` con conflicto de `syncVersion` regresa `state` actual
- [ ] Paso 5: Marcar completado en `TODO_FASE2.md`.

