const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('zavalaDesktop', {
  platform: process.platform,
  versions: process.versions
});
