const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function readConfig() {
  const configPaths = [
    path.join(app.getAppPath(), 'config.json'),
    path.join(path.dirname(process.execPath), 'config.json'),
    path.join(process.resourcesPath, 'app', 'config.json')
  ];

  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(raw);
      }
    } catch {
      continue;
    }
  }

  return { appUrl: '' };
}

function buildFallbackPage() {
  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>ZAVALAEXPRESS</title>
  <style>
    body { font-family: Segoe UI, sans-serif; margin: 24px; line-height: 1.5; }
    code { background: #f1f1f1; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>ZAVALAEXPRESS</h1>
  <p>Configura la URL de tu servidor antes de usar la app.</p>
  <p>Edita el archivo <code>config.json</code> dentro de la carpeta de la app o en <code>desktop/config.json</code> durante el desarrollo.</p>
  <pre>{ "appUrl": "https://tu-dominio-publico.com" }</pre>
</body>
</html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 720,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const config = readConfig();
  if (config.appUrl && /^https?:\/\//i.test(config.appUrl)) {
    win.loadURL(config.appUrl);
  } else {
    win.loadURL(buildFallbackPage());
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
