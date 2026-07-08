# TODO_FASE2.md — Fase 2: Mejoras compatibles con la app ya instalada

- [x] Planificar cambios (compatibilidad de esquema, tolerancia a datos legacy, no pérdida de datos al guardar)
- [x] Editar `backend/server.js`:
  - [x] `normalizePostgresSchema()` y/o `loadState()` para campos legacy/formatos alternos
  - [x] Tolerancia al parse de `personas`/numéricos cuando vengan como string vacíos o JSON inválido
  - [x] Asegurar que `POST /api/zavala/state` siempre haga merge seguro conservando campos faltantes
- [x] Validación local:
  - [x] Backend arranca y responde (smoke /health visible) y login pudo ejecutarse.
  - [ ] Simular un POST `/api/zavala/state` con conflicto de syncVersion (por restricciones de ejecución automática aquí).

- [x] Marcar completado en `TODO.md`




