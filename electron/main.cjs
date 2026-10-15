const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

// Geliştirme ortamı mı yoksa üretim mi kontrolü
const isDev = !app.isPackaged;

function createWindow() {
  // Tarayıcı penceresini oluştur
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    title: "Kısa Kes",
    webPreferences: {
      // Renderer'a Node erişimi verilmez; sadece preload'daki dosya yolu fonksiyonu açılır
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    autoHideMenuBar: true // Menü çubuğunu gizle
  });

  // Harici linkleri varsayılan tarayıcıda aç
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    // Geliştirme modunda localhost'tan yükle
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools(); // Konsolu aç
  } else {
    // Üretim modunda build edilen dosyayı yükle
    win.loadFile(path.join(__dirname, '../dist/index.html'));
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
