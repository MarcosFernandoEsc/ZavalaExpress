import sqlite3 from 'sqlite3';
const dbFile = 'data/state.db';
const db = new sqlite3.Database(dbFile, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('OPEN ERR:', err.message);
    process.exit(1);
  }
  db.all('PRAGMA table_info(usuarios)', [], (e, cols) => {
    if (e) console.error('PRAGMA ERR:', e.message);
    else console.log('PRAGMA table_info:', cols);
    db.all('SELECT id, nombre, username, "user", pass, rol, msgId FROM usuarios', [], (err2, rows) => {
      if (err2) console.error('SELECT ERR:', err2.message);
      else console.log('USERS:', rows);
      db.close(() => process.exit(0));
    });
  });
});
