import express from 'express';
import cors from 'cors';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);
const dataDir = join(__dirname, 'data');
const stateFile = join(dataDir, 'state.json');

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
  nxtId: 1,
  nxtFolio: 1,
  nxtUsrId: 3,
};

function ensureStorage() {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  if (!existsSync(stateFile)) {
    writeFileSync(stateFile, JSON.stringify(defaultState, null, 2), 'utf8');
  }
}

function loadState() {
  ensureStorage();
  try {
    const raw = readFileSync(stateFile, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState(state) {
  ensureStorage();
  writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8');
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(join(__dirname, 'public')));

app.get('/health', (_req, res) => {
  res.json({ ok: true, app: 'zavalaexpress-backend', status: 'advance' });
});

app.get('/api/zavala/state', (_req, res) => {
  res.json(loadState());
});

app.post('/api/zavala/state', (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object') {
    return res.status(400).json({ ok: false, message: 'Body inválido' });
  }

  const next = {
    ...loadState(),
    ...incoming,
  };

  saveState(next);
  res.json({ ok: true, saved: true });
});

app.get('/', (_req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`ZAVALAEXPRESS backend escuchando en http://localhost:${port}`);
});
