# Fase 1 — Validación y checklist (backend local-first)

## Alcance
Esta validación aplica al backend actual en `backend/server.js`, que provee:
- `POST /api/zavala/login`
- `GET /api/zavala/state` (requiere auth)
- `POST /api/zavala/state` (requiere auth, guarda estado completo con syncVersion)

> Nota: el backend actual no expone endpoints separados para CRUD de servicios; la creación/edición/finalización suceden al enviar el estado completo por `POST /api/zavala/state`.

---

## 1) Login admin y mensajero
- [x] Existe endpoint: `POST /api/zavala/login`
- [x] Verifica usuario por `u.user === user && u.pass === pass`
- [x] Crea token en tabla `sessions`
- [x] `req.user` se resuelve por `session.userId ?? session.userid`
- [x] Convierte `sessionUserId` a número y valida `Number.isFinite`

Criterio de no-error diario:
- Si token es inválido/expirado responde `401`.

---

## 2) Creación/Edición/Finalización de servicios
- [x] Estado de servicios se guarda en `servicios` como parte de `POST /api/zavala/state`.
- [x] `POST /api/zavala/state` normaliza tipos críticos:
  - `monto` como número
  - `fotoFinalReemplazos` como número
  - `personas` (si llega string, intenta JSON.parse y si falla deja array)
- [x] No se bloquea por conflicto de syncVersion: ante mismatch devuelve el `state` actual para reintento.

---

## 3) Sincronización entre dispositivos
- [x] `POST /api/zavala/state` compara `incoming.syncVersion` con `current.syncVersion`.
- [x] Si el cliente está desactualizado retorna:
  - `reason: 'sync_conflict'`
  - `currentVersion`
  - `state: sanitizeState(current)`
- [x] Cuando sync es consistente, incrementa `syncVersion` en `currentVersion + 1`.

Criterio de no-error diario:
- Evita “bloqueo”/loop de 409 forzando reload manual.

---

## 4) Errores de uso diario sin reinstalación
- [x] Manejo defensivo de tipos y formatos en servicios.
- [x] Normalización de `usuarios` al sanitizar la respuesta.
- [x] `syncVersion` conflict devuelve estado actual para reintentar.

---

## Evidencia en el código (rutas/funciones)
- `async function requireAuth(...)`
- `app.post('/api/zavala/state', requireAuth, ...)`
- `normalizeIncomingService(s)`

---

## Próximos pasos recomendados (fuera del alcance de este checklist)
- Probar en ambiente real (admin + mensajero) contra la URL desplegada y confirmar flujo completo de:
  1) iniciar sesión admin
  2) crear/editar servicio desde PC
  3) abrir desde móvil (sync GET)
  4) finalizar servicio desde móvil
  5) que ambos vean el cambio (sync POST)

