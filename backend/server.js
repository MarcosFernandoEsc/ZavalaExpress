import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import pg from 'pg';
import crypto from 'node:crypto';
import admin from 'firebase-admin';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);
const dataDir = join(__dirname, 'data');
const stateFile = join(dataDir, 'state.json');
const dbFile = join(dataDir, 'state.db');

const defaultState = {
  usuarios: [
    { id: 1, nombre: 'Administrador', user: 'admin', pass: '1234', rol: 'admin', msgId: null },
    { id: 2, nombre: 'Mensajero Demo', user: 'demo', pass: '1234', rol: 'mensajero', msgId: 1 },
  ],
  mensajeros: [
    { id: 1, nombre: 'Mensajero Demo', tel: '55 0000 0000', zona: 'Demo' },
  ],
  servicios: [],
  auditoria: [],
  reportesRecibidos: [],
  syncVersion: 1,
  nxtId: 1,
  nxtFolio: 1,
  nxtUsrId: 3,
};

let db = null;
let pgClient = null;
let firebaseMessaging = null;
let usePostgres = Boolean(process.env.DATABASE_URL);
const sseClients = new Set();
let stateMutationLock = Promise.resolve();

function initFirebaseMessaging() {
  if (firebaseMessaging) return;

  try {
    let serviceAccount = null;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      serviceAccount = {
        project_id: process.env.FIREBASE_PROJECT_ID,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };
    }

    if (!serviceAccount) {
      console.warn('Firebase no configurado. Push nativo deshabilitado.');
      return;
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    firebaseMessaging = admin.messaging();
    console.log('Firebase push habilitado.');
  } catch (error) {
    console.error('No se pudo inicializar Firebase Admin:', error.message);
    firebaseMessaging = null;
  }
}

function run(sql, params = []) {
  if (usePostgres) {
    // convert '?' placeholders to $1, $2... for pg
    let i = 0;
    const converted = sql.replace(/\?/g, () => `$${++i}`);
    return pgClient.query(converted, params).then((result) => result).catch((error) => {
      console.error('Postgres query error:', error.message);
      console.error('  SQL:', converted);
      console.error('  params:', params);
      throw error;
    });
  }

  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      return resolve(this);
    });
  });
}

function all(sql, params = []) {
  if (usePostgres) {
    let i = 0;
    const converted = sql.replace(/\?/g, () => `$${++i}`);
    return pgClient.query(converted, params).then((result) => result.rows);
  }

  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      return resolve(rows);
    });
  });
}

function get(sql, params = []) {
  if (usePostgres) {
    let i = 0;
    const converted = sql.replace(/\?/g, () => `$${++i}`);
    return pgClient.query(converted, params).then((result) => result.rows[0] || null);
  }

  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      return resolve(row);
    });
  });
}

async function ensureStorage() {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  if (usePostgres) {
    if (!pgClient) {
      await openPostgres();
    }
    return;
  }

  if (!db) {
    await openDatabase();
  }
}

async function openPostgres() {
  const { Pool } = pg;
  pgClient = new Pool({ connectionString: process.env.DATABASE_URL });
  await pgClient.query('SELECT 1');
  try {
    await initDatabase();
    await normalizePostgresSchema();
  } catch (error) {
    console.error('Error creando o normalizando tablas en Postgres:', error.message);
    throw error;
  }
  try {
    await migrateJsonState();
  } catch (error) {
    console.error('Error migrando JSON a Postgres:', error.message);
    throw error;
  }
  console.log('Postgres conectado.');
}

async function openDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbFile, async (err) => {
      if (err) return reject(err);
      try {
        await run('PRAGMA journal_mode = WAL');
        await initDatabase();
        await migrateJsonState();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function initDatabase() {
  if (usePostgres) {
    try {
      await run(`CREATE TABLE IF NOT EXISTS usuarios (
        id BIGINT PRIMARY KEY,
        nombre TEXT,
        username TEXT,
        pass TEXT,
        rol TEXT,
        msgId BIGINT
      )`);
    } catch (error) {
      console.error('Error creando tabla usuarios en Postgres:', error.message);
      throw error;
    }

    await run(`CREATE TABLE IF NOT EXISTS mensajeros (
      id BIGINT PRIMARY KEY,
      nombre TEXT,
      tel TEXT,
      zona TEXT
    )`);

    await run(`CREATE TABLE IF NOT EXISTS servicios (
      id BIGINT PRIMARY KEY,
      folio TEXT,
      msgId BIGINT,
      fecha TEXT,
      hora TEXT,
      monto REAL,
      estatus TEXT,
      obs TEXT,
      foto TEXT,
      creadoPor TEXT,
      creadoEn TEXT,
      finalizadoPor TEXT,
      finalizadoEn TEXT,
      finalizadoReporte TEXT,
      finalizadoResultado TEXT,
      fotoFinal TEXT,
      fotoFinalReemplazos BIGINT,
      eliminadoPor TEXT,
      eliminadoEn TEXT,
      editadoPor TEXT,
      editadoEn TEXT,
      personas TEXT
    )`);

    await run(`CREATE TABLE IF NOT EXISTS auditoria (
      ts TEXT,
      por TEXT,
      rol TEXT,
      folio TEXT,
      msgNombre TEXT,
      fecha TEXT,
      hora TEXT,
      personas TEXT,
      monto REAL,
      obs TEXT,
      srvId BIGINT
    )`);

    await run(`CREATE TABLE IF NOT EXISTS reportesRecibidos (
      id BIGINT PRIMARY KEY,
      paquete TEXT
    )`);

    await run(`CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);

    await run(`CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      userId BIGINT,
      createdAt TEXT,
      expiresAt TEXT
    )`);

    await run(`CREATE TABLE IF NOT EXISTS device_tokens (
      token TEXT PRIMARY KEY,
      userId BIGINT,
      msgId BIGINT,
      platform TEXT,
      updatedAt TEXT
    )`);

    await run(`CREATE TABLE IF NOT EXISTS push_events (
      eventKey TEXT PRIMARY KEY,
      createdAt TEXT
    )`);

    return;
  }

  await run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY,
    nombre TEXT,
    username TEXT,
    pass TEXT,
    rol TEXT,
    msgId INTEGER
  )`);

  await run(`CREATE TABLE IF NOT EXISTS mensajeros (
    id INTEGER PRIMARY KEY,
    nombre TEXT,
    tel TEXT,
    zona TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS servicios (
    id INTEGER PRIMARY KEY,
    folio TEXT,
    msgId INTEGER,
    fecha TEXT,
    hora TEXT,
    monto REAL,
    estatus TEXT,
    obs TEXT,
    foto TEXT,
    creadoPor TEXT,
    creadoEn TEXT,
    finalizadoPor TEXT,
    finalizadoEn TEXT,
    finalizadoReporte TEXT,
    finalizadoResultado TEXT,
    fotoFinal TEXT,
    fotoFinalReemplazos INTEGER,
    eliminadoPor TEXT,
    eliminadoEn TEXT,
    editadoPor TEXT,
    editadoEn TEXT,
    personas TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS auditoria (
    ts TEXT,
    por TEXT,
    rol TEXT,
    folio TEXT,
    msgNombre TEXT,
    fecha TEXT,
    hora TEXT,
    personas TEXT,
    monto REAL,
    obs TEXT,
    srvId INTEGER
  )`);

  await run(`CREATE TABLE IF NOT EXISTS reportesRecibidos (
    id INTEGER PRIMARY KEY,
    paquete TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    userId INTEGER,
    createdAt TEXT,
    expiresAt TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS device_tokens (
    token TEXT PRIMARY KEY,
    userId INTEGER,
    msgId INTEGER,
    platform TEXT,
    updatedAt TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS push_events (
    eventKey TEXT PRIMARY KEY,
    createdAt TEXT
  )`);
}

async function normalizePostgresSchema() {
  const result = await pgClient.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios'
  `);
  const columns = new Set(result.rows.map((row) => row.column_name));
  console.log('Postgres usuarios columns before normalize:', [...columns].join(', '));

  if (columns.has('user') && !columns.has('username')) {
    await run('ALTER TABLE usuarios RENAME COLUMN "user" TO username');
    console.log('Renamed usuarios.user to usuarios.username');
    columns.delete('user');
    columns.add('username');
  }

  if (!columns.has('username')) {
    await run('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS username TEXT');
    console.log('Added missing usuarios.username column');
    columns.add('username');
  }

  if (columns.has('user')) {
    await run('UPDATE usuarios SET username = "user" WHERE username IS NULL');
    await run('ALTER TABLE usuarios DROP COLUMN IF EXISTS "user"');
    console.log('Dropped legacy usuarios.user column');
    columns.delete('user');
  }

  const bigintColumns = [
    { table: 'usuarios', column: 'id' },
    { table: 'usuarios', column: 'msgId' },
    { table: 'mensajeros', column: 'id' },
    { table: 'servicios', column: 'id' },
    { table: 'servicios', column: 'msgId' },
    { table: 'auditoria', column: 'srvId' },
    { table: 'reportesRecibidos', column: 'id' },
    { table: 'sessions', column: 'userId' },
    { table: 'device_tokens', column: 'userId' },
    { table: 'device_tokens', column: 'msgId' },
  ];

  for (const { table, column } of bigintColumns) {
    try {
      await run(`ALTER TABLE ${table} ALTER COLUMN ${column} TYPE BIGINT`);
    } catch (error) {
      // Ignore errors when the column does not exist or already has the correct type.
      if (!error.message.includes('column') && !error.message.includes('does not exist')) {
        console.warn(`No changes made to ${table}.${column}:`, error.message);
      }
    }
  }
}

function nowISO() {
  return new Date().toISOString();
}

function parseServiceDateTime(service) {
  if (!service || !service.fecha) return null;
  const hhmm = (service.hora || '12:00').slice(0, 5);
  const date = new Date(`${service.fecha}T${hhmm}:00`);
  if (Number.isNaN(date.valueOf())) return null;
  return date;
}

async function recordPushEvent(eventKey) {
  if (usePostgres) {
    const result = await run(
      'INSERT INTO push_events (eventKey, createdAt) VALUES (?, ?) ON CONFLICT(eventKey) DO NOTHING',
      [eventKey, nowISO()]
    );
    return Number(result?.rowCount || 0) > 0;
  }

  const result = await run('INSERT OR IGNORE INTO push_events (eventKey, createdAt) VALUES (?, ?)', [eventKey, nowISO()]);
  return Number(result?.changes || 0) > 0;
}

async function removeDeviceToken(token) {
  await run('DELETE FROM device_tokens WHERE token = ?', [token]);
}

async function upsertDeviceToken({ token, userId, msgId, platform }) {
  await run(
    `INSERT INTO device_tokens (token, userId, msgId, platform, updatedAt)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(token) DO UPDATE SET
       userId = excluded.userId,
       msgId = excluded.msgId,
       platform = excluded.platform,
       updatedAt = excluded.updatedAt`,
    [token, userId, msgId, platform || 'android', nowISO()]
  );
}

async function getTokensByMsgId(msgId) {
  if (!msgId) return [];
  const rows = await all('SELECT token FROM device_tokens WHERE msgId = ?', [msgId]);
  return rows.map((r) => r.token).filter(Boolean);
}

async function getUserIdsByMsgId(msgId) {
  if (!msgId) return [];
  const rows = await all('SELECT id FROM usuarios WHERE msgId = ? AND rol = ?', [msgId, 'mensajero']);
  return rows.map((r) => Number(r.id)).filter((id) => Number.isFinite(id));
}

async function getTokensByUserIds(userIds) {
  const ids = (userIds || []).map((id) => Number(id)).filter((id) => Number.isFinite(id));
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = await all(`SELECT token FROM device_tokens WHERE userId IN (${placeholders})`, ids);
  return [...new Set(rows.map((r) => r.token).filter(Boolean))];
}

async function backfillDeviceTokenMsgIds() {
  const rows = await all('SELECT token, userId FROM device_tokens WHERE msgId IS NULL AND userId IS NOT NULL');
  for (const row of rows) {
    const userId = Number(row.userId ?? row.userid);
    if (!Number.isFinite(userId)) continue;
    const user = await get('SELECT msgId FROM usuarios WHERE id = ?', [userId]);
    const msgId = user?.msgId ?? user?.msgid ?? null;
    if (msgId === null || msgId === undefined || msgId === '') continue;
    await run('UPDATE device_tokens SET msgId = ?, updatedAt = ? WHERE token = ?', [Number(msgId), nowISO(), row.token]);
  }
}

async function getAdminUserIds(state) {
  return (state.usuarios || [])
    .filter((u) => u && u.rol === 'admin')
    .map((u) => Number(u.id))
    .filter((id) => Number.isFinite(id));
}

function normalizeMessengerLinks(state) {
  let changed = false;
  const byName = new Map((state.mensajeros || []).map((m) => [String(m.nombre || '').trim().toLowerCase(), Number(m.id)]));
  for (const u of state.usuarios || []) {
    if (!u || u.rol !== 'mensajero') continue;
    if (u.msgId !== null && u.msgId !== undefined && u.msgId !== '') continue;
    const inferred = byName.get(String(u.nombre || '').trim().toLowerCase());
    if (Number.isFinite(inferred)) {
      u.msgId = inferred;
      changed = true;
    }
  }
  return changed;
}

async function sendPushToMsgId(msgId, title, body, data = {}) {
  if (!firebaseMessaging || !msgId) return;
  await backfillDeviceTokenMsgIds();
  const directTokens = await getTokensByMsgId(msgId);
  const linkedUserIds = await getUserIdsByMsgId(msgId);
  const userTokens = linkedUserIds.length ? await getTokensByUserIds(linkedUserIds) : [];
  const tokens = [...new Set([...directTokens, ...userTokens])];
  console.log('Push routing by msgId', { msgId, directTokens: directTokens.length, linkedUsers: linkedUserIds.length, userTokens: userTokens.length, total: tokens.length });
  if (!tokens.length) return { attempted: 0, success: 0, failure: 0 };

  const response = await firebaseMessaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    android: {
      priority: 'high',
      notification: {
        channelId: 'zavala-default',
      },
    },
  });

  if (response.failureCount > 0) {
    response.responses.forEach(async (r, i) => {
      if (!r.success) {
        const code = r.error?.code || '';
        if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token')) {
          await removeDeviceToken(tokens[i]);
        }
      }
    });
  }

  console.log('Push send result by msgId', {
    msgId,
    attempted: tokens.length,
    success: response.successCount,
    failure: response.failureCount,
  });

  return { attempted: tokens.length, success: response.successCount, failure: response.failureCount };
}

async function sendPushToUserIds(userIds, title, body, data = {}) {
  if (!firebaseMessaging) return;
  const tokens = await getTokensByUserIds(userIds);
  if (!tokens.length) return { attempted: 0, success: 0, failure: 0 };

  const response = await firebaseMessaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    android: {
      priority: 'high',
      notification: {
        channelId: 'zavala-default',
      },
    },
  });

  if (response.failureCount > 0) {
    response.responses.forEach(async (r, i) => {
      if (!r.success) {
        const code = r.error?.code || '';
        if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token')) {
          await removeDeviceToken(tokens[i]);
        }
      }
    });
  }

  return { attempted: tokens.length, success: response.successCount, failure: response.failureCount };
}

async function notifyStateTransitions(currentState, nextState) {
  if (!firebaseMessaging) return;
  const currentById = new Map((currentState.servicios || []).map((s) => [s.id, s]));
  const adminUserIds = await getAdminUserIds(nextState);

  for (const service of nextState.servicios || []) {
    if (!service || service.eliminadoPor) continue;
    const prev = currentById.get(service.id);

    const isNew = !prev;
    const reassigned = prev && prev.msgId !== service.msgId;

    // Fase 4/Refuerzo: queremos que el mensajero reciba el aviso lo más rápido posible.
    // Regla:
    // - Si el servicio es NUEVO y ya viene con msgId (asignado desde admin), avisar al msgId.
    // - Si se reasigna (cambia msgId), avisar al nuevo msgId.
    // - Si el servicio es NUEVO pero msgId NO viene (aún no asignado), NO podemos enviar al mensajero,
    //   así que el aviso ocurrirá en el momento en que se asigne msgId.
    if ((isNew || reassigned) && service.msgId) {
      const eventKey = `srv:${service.id}:assigned:${service.msgId}`;
      const shouldSend = await recordPushEvent(eventKey);
      if (shouldSend) {
        await sendPushToMsgId(
          service.msgId,
          'Nuevo servicio asignado',
          `${service.folio || 'Servicio'} para ${service.fecha || 'hoy'} ${service.hora || ''}`.trim(),
          { type: 'assigned', serviceId: service.id, folio: service.folio || '' }
        );
      }
    }

    const wasFinalized = Boolean(prev?.finalizadoPor);
    const isFinalized = Boolean(service.finalizadoPor);
    if (!wasFinalized && isFinalized && adminUserIds.length) {
      const eventKey = `srv:${service.id}:finalized:${service.finalizadoEn || service.editadoEn || nowISO()}`;
      const shouldSend = await recordPushEvent(eventKey);
      if (shouldSend) {
        await sendPushToUserIds(
          adminUserIds,
          'Servicio finalizado',
          `${service.folio || 'Servicio'} fue finalizado por ${service.finalizadoPor || 'mensajero'}`,
          { type: 'finalized', serviceId: service.id, folio: service.folio || '' }
        );
      }
    }
  }
}


async function processReminderPushes() {
  if (!firebaseMessaging) return;
  const state = await loadState();
  const now = new Date();

  for (const service of state.servicios || []) {
    if (!service || service.eliminadoPor || service.finalizadoPor || !service.msgId) continue;
    const when = parseServiceDateTime(service);
    if (!when) continue;

    const reminders = [
      { key: 'pre2d', at: new Date(when.valueOf() - 2 * 24 * 60 * 60 * 1000), title: 'Recordatorio: servicio en 2 dias' },
      { key: 'pre1d', at: new Date(when.valueOf() - 24 * 60 * 60 * 1000), title: 'Recordatorio: servicio manana' },
      { key: 'pre3h', at: new Date(when.valueOf() - 3 * 60 * 60 * 1000), title: 'Recordatorio: servicio en 3 horas' },
      { key: 'overdue', at: when, title: 'Servicio pendiente por finalizar', overdue: true },
    ];

    for (const reminder of reminders) {
      if (now < reminder.at) continue;
      const eventKey = `srv:${service.id}:${reminder.key}`;
      const shouldSend = await recordPushEvent(eventKey);
      if (!shouldSend) continue;

      const body = reminder.overdue
        ? `Ya paso la hora de ${service.folio || 'servicio'}. Finaliza la entrega.`
        : `${service.folio || 'Servicio'} programado ${service.fecha || ''} ${service.hora || ''}`.trim();

      await sendPushToMsgId(service.msgId, reminder.title, body, {
        type: reminder.key,
        serviceId: service.id,
        folio: service.folio || '',
      });
    }
  }
}

function startReminderLoop() {
  if (!firebaseMessaging) return;
  processReminderPushes().catch((error) => console.error('Error en reminder inicial:', error.message));
  setInterval(() => {
    processReminderPushes().catch((error) => console.error('Error en reminder loop:', error.message));
  }, 60 * 1000);
}

async function createSession(userId) {
  // Fase 3: Seguridad sin reinicios.
  // Guardamos un token “no reversible” (hash) para que un dump de BD no entregue sesiones.
  const rawToken = crypto.randomUUID();
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const createdAt = nowISO();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await run(
    'INSERT INTO sessions (token, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)',
    [tokenHash, userId, createdAt, expiresAt]
  );
  console.log('Created session', { token: rawToken.slice(0, 8) + '...', userId, createdAt, expiresAt });
  return rawToken;
}


async function findSession(token) {
  if (!token) return null;
  await ensureStorage();

  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
  const session = await get('SELECT * FROM sessions WHERE token = ? AND expiresAt > ?', [tokenHash, nowISO()]);

  if (!session) {
    console.log('Session not found or expired for token:', token ? String(token).slice(0, 8) + '...' : '(empty)');
  } else {
    console.log('Session found for token:', token ? String(token).slice(0, 8) + '...' : '(empty)', 'session:', session);
  }
  return session;
}


async function getUserById(userId) {
  if (userId === undefined || userId === null) return null;
  const numericId = Number(userId);
  console.log('Looking up user by id:', { userId, numericId });

  // SQLite: some older DBs might have `user` column instead of `username`.
  // We never rely on `username` being present; we map both.
  const user = await get('SELECT * FROM usuarios WHERE id = ?', [numericId]);
  if (user) {
    const mapped = {
      ...user,
      username: user.username ?? user.user,
      user: user.user ?? user.username,
    };
    console.log('Found user in DB:', { id: mapped.id, username: mapped.username, user: mapped.user });
    return mapped;
  }

  const state = await loadState();
  const fallback = (state.usuarios || []).find((u) => Number(u.id) === numericId) || null;
  console.log('Fallback state lookup for user id', numericId, 'found:', !!fallback);
  return fallback;
}


function resolveAuthToken(req) {
  const header = req.headers.authorization || req.headers['authorization'] || req.headers['x-access-token'] || req.headers['x-auth-token'];
  if (typeof header === 'string') {
    const normalized = header.trim();
    const bearerMatch = normalized.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch) {
      return bearerMatch[1];
    }
    return normalized;
  }
  if (req.query && req.query.token) {
    return String(req.query.token);
  }
  if (req.body && typeof req.body.token === 'string') {
    return req.body.token;
  }
  return null;
}

async function requireAuth(req, res, next) {
  const token = resolveAuthToken(req);
  if (!token) {
    const isExpectedPublicProbe = req.path === '/api/zavala/state';
    if (!isExpectedPublicProbe) {
      console.log('Unauthorized request: missing Bearer header or token query', {
        method: req.method,
        path: req.path,
        query: req.query,
        bodyToken: req.body?.token,
        headers: {
          authorization: req.headers.authorization || req.headers['authorization'],
          xAccessToken: req.headers['x-access-token'],
          xAuthToken: req.headers['x-auth-token'],
        },
      });
    }
    return res.status(401).json({ ok: false, message: 'No autorizado' });
  }

  try {
    const session = await findSession(token);
    if (!session) {
      return res.status(401).json({ ok: false, message: 'Token inválido o expirado' });
    }

    const sessionUserIdRaw = session.userId ?? session.userid;
    const sessionUserId = Number(sessionUserIdRaw);
    if (!Number.isFinite(sessionUserId)) {
      console.log('Session userId inválido:', { sessionUserIdRaw, token: token ? token.slice(0, 8) + '...' : '' });
      return res.status(401).json({ ok: false, message: 'Token inválido o expirado' });
    }
    const user = await getUserById(sessionUserId);

    if (!user) {
      console.log('Authenticated session user not found:', sessionUserId, 'raw session:', session);
      return res.status(401).json({ ok: false, message: 'Usuario no encontrado' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ ok: false, message: 'Error de autenticación' });
  }
}

function sanitizeUsers(users) {
  return (users || []).map(({ pass, username, user, usuario, msgId, id, ...rest }) => ({
    ...rest,
    id: Number(id),
    user: user || username || usuario || '',
    msgId: msgId === null ? null : Number(msgId),
  }));
}

function safeParseJsonArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function sanitizeState(state) {
  const safe = {
    ...state,
    usuarios: sanitizeUsers(state.usuarios),
    servicios: Array.isArray(state.servicios)
      ? state.servicios.map((s) => ({
          ...s,
          monto: Number.isFinite(Number(s?.monto)) ? Number(s.monto) : 0,
          fotoFinalReemplazos: Number.isFinite(Number(s?.fotoFinalReemplazos)) ? Number(s.fotoFinalReemplazos) : 0,
          personas: safeParseJsonArray(s?.personas, []),
        }))
      : [],
    auditoria: Array.isArray(state.auditoria)
      ? state.auditoria.map((a) => ({
          ...a,
          monto: Number.isFinite(Number(a?.monto)) ? Number(a.monto) : 0,
          personas: safeParseJsonArray(a?.personas, []),
        }))
      : [],
  };

  return safe;
}

function broadcastSse(event, payload) {
  const serialized = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.res.write(serialized);
    } catch {
      sseClients.delete(client);
    }
  }
}

function broadcastStateUpdate(syncVersion, changedBy) {
  broadcastSse('state_update', {
    syncVersion: Number(syncVersion || 0),
    changedBy: Number.isFinite(Number(changedBy)) ? Number(changedBy) : null,
    ts: nowISO(),
  });
}

async function withStateMutationLock(fn) {
  const previous = stateMutationLock;
  let release;
  stateMutationLock = new Promise((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}

setInterval(() => {
  if (!sseClients.size) return;
  broadcastSse('ping', { ts: nowISO() });
}, 25000);


function sendSecureHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
}

function readJsonState() {
  try {
    const raw = readFileSync(stateFile, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function migrateJsonState() {
  const stateJson = readJsonState();
  const row = await get('SELECT COUNT(*) AS count FROM usuarios');
  const count = Number(row?.count || 0);
  if (count > 0) return;

  if (stateJson) {
    console.log('Migrating JSON state into empty database.');
    await saveState(stateJson);
    return;
  }

  console.log('Database is empty and no JSON state found. Initializing default state.');
  await saveState(defaultState);
}

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed' && err.message.includes('JSON')) {
    console.error('JSON parse error:', err.message);
    return res.status(400).json({ ok: false, message: 'JSON inválido en la petición' });
  }

  // Mensajes más claros para el cliente (sin exponer detalles internos)
  if (err) {
    console.error('Request error:', {
      message: err.message,
      path: req?.path,
      method: req?.method,
    });
    return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }

  next(err);
});


function writeJsonBackup(state) {
  try {
    writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8');
  } catch (error) {
    console.error('No se pudo escribir backup JSON', error);
  }
}

async function loadState() {
  await ensureStorage();

  const pick = (row, ...keys) => {
    for (const key of keys) {
      if (row[key] !== undefined) return row[key];
    }
    return null;
  };
  const toNullableNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const usuarios = await all('SELECT * FROM usuarios');
  const mensajeros = await all('SELECT * FROM mensajeros');
  const serviciosRows = await all('SELECT * FROM servicios');
  const auditoriaRows = await all('SELECT * FROM auditoria');
  const reportesRows = await all('SELECT * FROM reportesRecibidos');
  const metaRows = await all('SELECT * FROM meta');

  const state = {
    ...defaultState,
    usuarios: usuarios.map((row) => ({
      id: Number(row.id),
      nombre: row.nombre,
      user: pick(row, 'username', 'user') || '',
      pass: row.pass,
      rol: row.rol,
      msgId: toNullableNumber(pick(row, 'msgId', 'msgid')),
    })),
    mensajeros: mensajeros.map((row) => ({
      id: Number(row.id),
      nombre: row.nombre,
      tel: row.tel,
      zona: row.zona,
    })),
    servicios: serviciosRows.map((row) => ({
      id: Number(row.id),
      folio: row.folio,
      msgId: toNullableNumber(pick(row, 'msgId', 'msgid')),
      fecha: row.fecha,
      hora: row.hora,
      monto: row.monto === null ? 0 : Number(row.monto),
      estatus: row.estatus,
      obs: row.obs,
      foto: row.foto,
      creadoPor: pick(row, 'creadoPor', 'creadopor') || '',
      creadoEn: pick(row, 'creadoEn', 'creadoen') || '',
      finalizadoPor: pick(row, 'finalizadoPor', 'finalizadopor') || '',
      finalizadoEn: pick(row, 'finalizadoEn', 'finalizadoen') || '',
      finalizadoReporte: pick(row, 'finalizadoReporte', 'finalizadoreporte') || '',
      finalizadoResultado: pick(row, 'finalizadoResultado', 'finalizadoresultado') || '',
      fotoFinal: pick(row, 'fotoFinal', 'fotofinal') || '',
      fotoFinalReemplazos: Number(toNullableNumber(pick(row, 'fotoFinalReemplazos', 'fotofinalreemplazos')) || 0),
      eliminadoPor: pick(row, 'eliminadoPor', 'eliminadopor') || '',
      eliminadoEn: pick(row, 'eliminadoEn', 'eliminadoen') || '',
      editadoPor: pick(row, 'editadoPor', 'editadopor') || '',
      editadoEn: pick(row, 'editadoEn', 'editadoen') || '',
      personas: safeParseJsonArray(row.personas, []),
    })),

    auditoria: auditoriaRows.map((row) => ({
      ts: row.ts,
      por: row.por,
      rol: row.rol,
      folio: row.folio,
      msgNombre: pick(row, 'msgNombre', 'msgnombre') || '',
      fecha: row.fecha,
      hora: row.hora,
      personas: safeParseJsonArray(row.personas, []),
      monto: row.monto === null ? 0 : Number(row.monto),

      obs: row.obs,
      srvId: toNullableNumber(pick(row, 'srvId', 'srvid')),
    })),
    reportesRecibidos: reportesRows.map((row) => {
      try {
        return JSON.parse(row.paquete);
      } catch {
        return null;
      }
    }).filter(Boolean),
    nxtId: defaultState.nxtId,
    nxtFolio: defaultState.nxtFolio,
    nxtUsrId: defaultState.nxtUsrId,
    syncVersion: defaultState.syncVersion,
  };

  for (const { key, value } of metaRows) {
    try {
      const parsed = JSON.parse(value);
      if (key in state) {
        state[key] = parsed;
      }
    } catch {
      if (key === 'nxtId') state.nxtId = Number(value) || state.nxtId;
      if (key === 'nxtFolio') state.nxtFolio = Number(value) || state.nxtFolio;
      if (key === 'nxtUsrId') state.nxtUsrId = Number(value) || state.nxtUsrId;
      if (key === 'syncVersion') state.syncVersion = Number(value) || state.syncVersion;
    }
  }

  normalizeMessengerLinks(state);

  if (!state.usuarios.length) {
    return defaultState;
  }

  return state;
}

async function saveState(state) {
  await ensureStorage();
  await run('BEGIN TRANSACTION');
  try {
    // Persistimos el snapshot ya reconciliado (current + incoming) de forma atómica.
    // Así evitamos fallas por llaves duplicadas y mantenemos consistencia entre tablas.
    await run('DELETE FROM auditoria');
    await run('DELETE FROM reportesRecibidos');
    await run('DELETE FROM servicios');
    await run('DELETE FROM mensajeros');
    await run('DELETE FROM usuarios');
    await run('DELETE FROM meta');

    // Persistencia de usuarios.
    const insertUsuario = 'INSERT INTO usuarios (id, nombre, username, pass, rol, msgId) VALUES (?, ?, ?, ?, ?, ?)';

    for (const u of state.usuarios || []) {
      await run(insertUsuario, [u.id, u.nombre, u.user, u.pass, u.rol, u.msgId]);
    }

    const insertMensajero = 'INSERT INTO mensajeros (id, nombre, tel, zona) VALUES (?, ?, ?, ?)';
    for (const m of state.mensajeros || []) {
      await run(insertMensajero, [m.id, m.nombre, m.tel, m.zona]);
    }

    const insertServicio = `INSERT INTO servicios (
      id, folio, msgId, fecha, hora, monto, estatus, obs, foto,
      creadoPor, creadoEn, finalizadoPor, finalizadoEn, finalizadoReporte,
      finalizadoResultado, fotoFinal, fotoFinalReemplazos, eliminadoPor,
      eliminadoEn, editadoPor, editadoEn, personas
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    for (const v of state.servicios || []) {
      await run(insertServicio, [
        v.id,
        v.folio,
        v.msgId,
        v.fecha,
        v.hora,
        v.monto || 0,
        v.estatus || 'Programado',
        v.obs || '',
        v.foto || '',
        v.creadoPor || '',
        v.creadoEn || '',
        v.finalizadoPor || '',
        v.finalizadoEn || '',
        v.finalizadoReporte || '',
        v.finalizadoResultado || '',
        v.fotoFinal || '',
        v.fotoFinalReemplazos || 0,
        v.eliminadoPor || '',
        v.eliminadoEn || '',
        v.editadoPor || '',
        v.editadoEn || '',
        JSON.stringify(v.personas || []),
      ]);
    }

    const insertAuditoria = 'INSERT INTO auditoria (ts, por, rol, folio, msgNombre, fecha, hora, personas, monto, obs, srvId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    for (const a of state.auditoria || []) {
      await run(insertAuditoria, [
        a.ts || '',
        a.por || '',
        a.rol || '',
        a.folio || '',
        a.msgNombre || '',
        a.fecha || '',
        a.hora || '',
        JSON.stringify(a.personas || []),
        a.monto || 0,
        a.obs || '',
        a.srvId || null,
      ]);
    }

    const insertReporte = 'INSERT INTO reportesRecibidos (id, paquete) VALUES (?, ?)';
    for (const [index, r] of (state.reportesRecibidos || []).entries()) {
      await run(insertReporte, [index + 1, JSON.stringify(r)]);
    }

    const insertMeta = 'INSERT INTO meta (key, value) VALUES (?, ?)';
    await run(insertMeta, ['nxtId', JSON.stringify(state.nxtId || defaultState.nxtId)]);
    await run(insertMeta, ['nxtFolio', JSON.stringify(state.nxtFolio || defaultState.nxtFolio)]);
    await run(insertMeta, ['nxtUsrId', JSON.stringify(state.nxtUsrId || defaultState.nxtUsrId)]);
    await run(insertMeta, ['syncVersion', JSON.stringify(state.syncVersion || defaultState.syncVersion)]);

    await run('COMMIT');
    writeJsonBackup(state);
  } catch (error) {
    await run('ROLLBACK');
    throw error;
  }
}

app.use(sendSecureHeaders);
app.use(cors({
  exposedHeaders: ['Authorization', 'X-Access-Token', 'X-Auth-Token'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Access-Token', 'X-Auth-Token'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(join(__dirname, 'public')));

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    console.error('JSON parse error:', err.message);
    return res.status(400).json({ ok: false, message: 'JSON inválido en la petición' });
  }
  next(err);
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    app: 'zavalaexpress-backend',
    status: 'advance',
    // Aumenta esto cuando quieras forzar compatibilidad por versión de app.
    backendVersion: 6,
  });
});

app.get('/api/zavala/events', requireAuth, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  // Ask EventSource clients to retry quickly on disconnect.
  res.write('retry: 3000\n\n');

  try {
    const current = await loadState();
    res.write(`event: hello\ndata: ${JSON.stringify({ syncVersion: Number(current.syncVersion || 0), ts: nowISO() })}\n\n`);
  } catch {
    res.write(`event: hello\ndata: ${JSON.stringify({ syncVersion: 0, ts: nowISO() })}\n\n`);
  }

  const client = { res, userId: Number(req.user?.id) || null };
  sseClients.add(client);

  req.on('close', () => {
    sseClients.delete(client);
  });
});


app.get('/api/zavala/users', async (_req, res) => {
  try {
    const state = await loadState();
    res.json(sanitizeUsers(state.usuarios));
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, message: 'Error al cargar usuarios' });
  }
});

app.post('/api/zavala/login', async (req, res) => {
  const user = req.body.user ?? req.body.username ?? req.body.usuario;
  const pass = req.body.pass ?? req.body.password ?? req.body.pin;

  if (typeof user !== 'string' || typeof pass !== 'string') {
    return res.status(400).json({ ok: false, message: 'Usuario y PIN deben ser texto' });
  }

  const userTrim = user.trim();
  const loginNormalized = userTrim.toLowerCase();
  if (!userTrim || !pass.trim()) {
    return res.status(400).json({ ok: false, message: 'Usuario o PIN faltante' });
  }

  try {
    const state = await loadState();
    const found = (state.usuarios || []).find((u) => {
      const storedUser = String(u.user ?? u.username ?? u.usuario ?? '').trim().toLowerCase();
      return storedUser === loginNormalized && String(u.pass) === String(pass);
    });
    if (!found) {
      return res.status(401).json({ ok: false, message: 'Usuario o PIN incorrecto' });
    }

    const token = await createSession(found.id);
    res.json({ ok: true, token, usuario: sanitizeUsers([found])[0], state: sanitizeState(state) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, message: 'Error al autenticar usuario' });
  }
});


app.get('/api/zavala/state', requireAuth, async (_req, res) => {
  try {
    const state = await loadState();
    res.json(sanitizeState(state));
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, message: 'Error al cargar estado' });
  }
});

app.post('/api/zavala/logout', requireAuth, async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      await run('DELETE FROM sessions WHERE token = ?', [token]);
    }
    res.json({ ok: true, loggedOut: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, message: 'Error al cerrar sesión' });
  }
});

app.post('/api/zavala/push/register', requireAuth, async (req, res) => {
  const token = String(req.body?.token || '').trim();
  const platform = String(req.body?.platform || 'android').trim();
  if (!token) {
    return res.status(400).json({ ok: false, message: 'Token faltante' });
  }

  try {
    const state = await loadState();
    const stateUser = (state.usuarios || []).find((u) => Number(u.id) === Number(req.user.id));
    const resolvedMsgId = req.user.msgId ?? stateUser?.msgId ?? null;

    if (resolvedMsgId !== null && resolvedMsgId !== undefined) {
      await run('UPDATE usuarios SET msgId = ? WHERE id = ? AND msgId IS NULL', [resolvedMsgId, req.user.id]);
    }

    await upsertDeviceToken({
      token,
      userId: req.user.id,
      msgId: resolvedMsgId,
      platform,
    });
    console.log('Push token registered', {
      userId: Number(req.user.id),
      msgId: resolvedMsgId === null ? null : Number(resolvedMsgId),
      platform,
      tokenPreview: `${token.slice(0, 12)}...`,
    });
    res.json({ ok: true, registered: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, message: 'Error registrando token push' });
  }
});

app.get('/api/zavala/push/debug', requireAuth, async (req, res) => {
  if (req.user?.rol !== 'admin') {
    return res.status(403).json({ ok: false, message: 'Solo admin' });
  }

  try {
    await backfillDeviceTokenMsgIds();
    const rows = await all('SELECT userId, msgId, platform, updatedAt FROM device_tokens ORDER BY updatedAt DESC LIMIT 100');
    const state = await loadState();
    const byMsg = {};
    rows.forEach((r) => {
      const key = String(r.msgId ?? r.msgid ?? 'null');
      byMsg[key] = (byMsg[key] || 0) + 1;
    });

    res.json({
      ok: true,
      totalTokens: rows.length,
      byMsg,
      mensajeros: (state.mensajeros || []).length,
      usuariosMensajero: (state.usuarios || []).filter((u) => u.rol === 'mensajero').length,
      lastTokens: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, message: 'Error consultando debug de push', detail: error.message });
  }
});

app.post('/api/zavala/push/test', requireAuth, async (req, res) => {
  if (req.user?.rol !== 'admin') {
    return res.status(403).json({ ok: false, message: 'Solo admin' });
  }

  const title = String(req.body?.title || 'Prueba ZAVALAEXPRESS');
  const body = String(req.body?.body || 'Si ves esto, el push funciona.');
  const msgId = req.body?.msgId !== undefined && req.body?.msgId !== null ? Number(req.body.msgId) : null;
  const userId = req.body?.userId !== undefined && req.body?.userId !== null ? Number(req.body.userId) : null;

  try {
    if (msgId && Number.isFinite(msgId)) {
      const result = await sendPushToMsgId(msgId, title, body, { type: 'manual_test', msgId });
      return res.json({ ok: true, target: { msgId }, result });
    }

    if (userId && Number.isFinite(userId)) {
      const result = await sendPushToUserIds([userId], title, body, { type: 'manual_test', userId });
      return res.json({ ok: true, target: { userId }, result });
    }

    return res.status(400).json({ ok: false, message: 'Envia msgId o userId para prueba' });
  } catch (error) {
    console.error('Push test error:', error);
    return res.status(500).json({ ok: false, message: 'Error enviando push de prueba', detail: error.message });
  }
});

app.post('/api/zavala/push/unregister', requireAuth, async (req, res) => {
  const token = String(req.body?.token || '').trim();
  if (!token) {
    return res.status(400).json({ ok: false, message: 'Token faltante' });
  }

  try {
    await removeDeviceToken(token);
    res.json({ ok: true, unregistered: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, message: 'Error eliminando token push' });
  }
});

app.post('/api/zavala/state', requireAuth, async (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object') {
    return res.status(400).json({ ok: false, message: 'Body inválido' });
  }

  try {
    await withStateMutationLock(async () => {
    const current = await loadState();

    // Fase 6: compatibilidad app↔backend sin reinstalación.
    // El cliente puede mandar backendCompatVersion. Si no viene, se asume compatible.
    // Nota: esto NO rompe por default; solo avisa.
    const backendCompatVersion = Number(incoming.backendCompatVersion ?? incoming.backend_version ?? 0);
    const backendVersion = 6;
    if (Number.isFinite(backendCompatVersion) && backendCompatVersion > 0 && backendCompatVersion !== backendVersion) {
      // Regresamos estado actual para que el cliente se reconcilie.
      return res.status(409).json({
        ok: false,
        message: 'Compatibilidad de versión. Se regresó el estado para reintentar con el backend actualizado.',
        reason: 'backend_version_mismatch',
        backendVersion,
        clientCompatVersion: backendCompatVersion,
        state: sanitizeState(current),
      });
    }

    const incomingVersion = Number(incoming.syncVersion);
    const currentVersion = Number(current.syncVersion || 1);

    if (!Number.isFinite(incomingVersion)) {
      return res.status(409).json({
        ok: false,
        message: 'Cliente desactualizado. Recarga para sincronizar estado.',
        reason: 'missing_sync_version',
        currentVersion,
      });
    }

    // Si el cliente trae una syncVersion atrasada (apps ya instaladas / sin reinstalación),
    // evitamos bloquear el uso: regresamos el estado actual para que el cliente lo aplique.
    if (incomingVersion !== currentVersion) {
      return res.status(409).json({
        ok: false,
        message: 'Estado desactualizado. Se regresó el estado más reciente para reintentar sincronización.',
        reason: 'sync_conflict',
        currentVersion,
        state: sanitizeState(current),
      });
    }



    let usuarios = incoming.usuarios;
    if (Array.isArray(usuarios)) {
      usuarios = usuarios.map((u) => {
        const existing = current.usuarios.find((item) => item.id === u.id);
        return {
          ...existing,
          ...u,
          pass: u.pass === undefined ? existing?.pass : u.pass,
        };
      });
    }

    // Normalización defensiva para evitar fallas por tipos/formatos en apps ya instaladas.
    const normalizeIncomingService = (s) => {
      if (!s || typeof s !== 'object') return s;
      const out = { ...s };
      if (out.monto === '' || out.monto === undefined || out.monto === null) out.monto = out.monto || 0;
      out.monto = Number(out.monto);
      if (!Number.isFinite(out.monto)) out.monto = 0;
      if (out.fotoFinalReemplazos === undefined || out.fotoFinalReemplazos === null || out.fotoFinalReemplazos === '') out.fotoFinalReemplazos = 0;
      const fr = Number(out.fotoFinalReemplazos);
      out.fotoFinalReemplazos = Number.isFinite(fr) ? fr : 0;
      if (typeof out.personas === 'string') {
        try { out.personas = JSON.parse(out.personas); } catch { out.personas = []; }
      }
      if (!Array.isArray(out.personas)) out.personas = [];
      return out;
    };

    const incomingServicios = Array.isArray(incoming.servicios)
      ? incoming.servicios.map(normalizeIncomingService)
      : incoming.servicios;

    const isAdminUser = req.user?.rol === 'admin';
    const stateUser = (current.usuarios || []).find((u) => Number(u.id) === Number(req.user?.id));
    const userMsgId = Number(req.user?.msgId ?? stateUser?.msgId);

    const mergeServiciosById = (base, updates) => {
      // Merge conservador por id: preserva campos que existían y no vienen en el payload legacy.
      if (!Array.isArray(base) || !Array.isArray(updates)) return updates !== undefined ? updates : base;
      const byId = new Map(base.map((s) => [Number(s?.id), s]));
      const out = [];

      for (const u of updates) {
        if (!u || !Number.isFinite(Number(u.id))) continue;
        const id = Number(u.id);
        const existing = byId.get(id);
        const merged = {
          ...(existing || {}),
          ...u,
          id,
        };
        out.push(normalizeIncomingService(merged));
        byId.delete(id);
      }

      // Mantener servicios que no vinieron en el payload
      for (const remaining of byId.values()) {
        out.push(normalizeIncomingService(remaining));
      }

      return out;
    };

    const normalizeIncomingAuditoria = (a) => {
      if (!a || typeof a !== 'object') return a;
      const out = { ...a };
      if (typeof out.personas === 'string') {
        try {
          out.personas = JSON.parse(out.personas);
        } catch {
          out.personas = [];
        }
      }
      if (!Array.isArray(out.personas)) out.personas = [];
      if (out.monto === '' || out.monto === undefined || out.monto === null) out.monto = 0;
      out.monto = Number(out.monto);
      if (!Number.isFinite(out.monto)) out.monto = 0;
      return out;
    };

    const mergeAuditoriaConservador = (base, updates) => {
      if (!Array.isArray(base) || !Array.isArray(updates)) return updates !== undefined ? updates : base;
      const keyOf = (a) => {
        const srvId = a?.srvId ?? a?.srvid;
        if (srvId !== undefined && srvId !== null && srvId !== '') return `srv:${Number(srvId)}`;
        return `folio:${String(a?.folio || '')}|ts:${String(a?.ts || '')}`;
      };
      const byKey = new Map(base.map((a) => [keyOf(a), a]));
      const out = [];

      for (const a of updates) {
        if (!a || typeof a !== 'object') continue;
        const key = keyOf(a);
        const existing = byKey.get(key);
        const merged = existing ? { ...existing, ...a } : { ...a };
        out.push(normalizeIncomingAuditoria(merged));
        byKey.delete(key);
      }

      for (const remaining of byKey.values()) {
        out.push(normalizeIncomingAuditoria(remaining));
      }

      return out;
    };

    const normalizeIncomingReportes = (r) => {
      if (r === null || r === undefined) return null;
      if (typeof r === 'object') return r;
      if (typeof r === 'string') {
        try {
          return JSON.parse(r);
        } catch {
          return r;
        }
      }
      return r;
    };

    const mergeReportesRecibidosConservador = (base, updates) => {
      // Conservador por índice (si el cliente manda un subset incompleto, no se eliminan los demás).
      if (!Array.isArray(base) || !Array.isArray(updates)) return updates !== undefined ? updates : base;
      const out = [...base];
      updates.forEach((r, idx) => {
        const nr = normalizeIncomingReportes(r);
        if (nr === null || nr === undefined || nr === '') return;
        out[idx] = nr;
      });
      return out;
    };

    const dedupeById = (arr) => {
      if (!Array.isArray(arr)) return arr;
      const map = new Map();
      for (const item of arr) {
        const id = Number(item?.id);
        if (!Number.isFinite(id)) continue;
        map.set(id, { ...item, id });
      }
      return Array.from(map.values());
    };

    const mergedServicios = incomingServicios !== undefined
      ? mergeServiciosById(current.servicios, incomingServicios)
      : current.servicios;
    let mergedUsuarios = usuarios || current.usuarios;
    let mergedMensajeros = Array.isArray(incoming.mensajeros) ? incoming.mensajeros : current.mensajeros;
    let mergedAuditoria = Array.isArray(incoming.auditoria) ? mergeAuditoriaConservador(current.auditoria, incoming.auditoria) : current.auditoria;
    let mergedReportesRecibidos = Array.isArray(incoming.reportesRecibidos)
      ? mergeReportesRecibidosConservador(current.reportesRecibidos, incoming.reportesRecibidos)
      : current.reportesRecibidos;
    let effectiveServicios = mergedServicios;

    if (!isAdminUser) {
      if (!Number.isFinite(userMsgId)) {
        return res.status(403).json({ ok: false, message: 'Usuario sin mensajero asociado', reason: 'missing_msgid' });
      }

      const ownServiceIds = new Set(
        (current.servicios || [])
          .filter((s) => Number(s?.msgId) === userMsgId)
          .map((s) => Number(s.id)),
      );

      const allowedPatch = (svc) => ({
        id: Number(svc.id),
        estatus: svc.estatus,
        monto: svc.monto,
        foto: svc.foto,
        finalizadoPor: svc.finalizadoPor,
        finalizadoEn: svc.finalizadoEn,
        finalizadoReporte: svc.finalizadoReporte,
        finalizadoResultado: svc.finalizadoResultado,
        fotoFinal: svc.fotoFinal,
        fotoFinalReemplazos: svc.fotoFinalReemplazos,
        editadoPor: svc.editadoPor,
        editadoEn: svc.editadoEn,
        recordatoriosEnviadas: svc.recordatoriosEnviadas,
      });

      const messengerIncomingServicios = Array.isArray(incomingServicios)
        ? incomingServicios
          .filter((s) => Number.isFinite(Number(s?.id)) && ownServiceIds.has(Number(s.id)))
          .map(allowedPatch)
        : [];

      effectiveServicios = mergeServiciosById(current.servicios, messengerIncomingServicios);
      mergedUsuarios = current.usuarios;
      mergedMensajeros = current.mensajeros;
      mergedAuditoria = current.auditoria;
      mergedReportesRecibidos = current.reportesRecibidos;
    }

    const next = {
      ...current,
      ...incoming,
      servicios: dedupeById(effectiveServicios),
      usuarios: dedupeById(mergedUsuarios),
      mensajeros: dedupeById(mergedMensajeros),
      auditoria: mergedAuditoria,
      reportesRecibidos: mergedReportesRecibidos,
      syncVersion: currentVersion + 1,
    };


    await saveState(next);

    notifyStateTransitions(current, next).catch((error) => console.error('Error enviando push de cambios:', error.message));
    broadcastStateUpdate(next.syncVersion, req.user?.id);
    res.json({ ok: true, saved: true });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, message: 'Error al guardar estado', detail: error?.message || String(error) });
  }
});

app.get('/', (_req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  initFirebaseMessaging();
  startReminderLoop();
  console.log(`ZAVALAEXPRESS backend escuchando en http://localhost:${port}`);
});
