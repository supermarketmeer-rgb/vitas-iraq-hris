import { app, BrowserWindow, ipcMain, Tray, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let tray = null;

// Catch any unhandled errors so window always stays open
process.on('uncaughtException', (err) => {
  console.error('[ELECTRON MAIN] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[ELECTRON MAIN] Unhandled rejection:', reason);
});

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

async function startLocalServer() {
  try {
    const serverScript = path.join(__dirname, '..', 'server.js');
    console.log('[ELECTRON MAIN] Initializing server script:', serverScript);
    if (fs.existsSync(serverScript)) {
      const fileUrl = `file://${serverScript.replace(/\\/g, '/')}`;
      await import(fileUrl).catch(err => {
        console.warn('[ELECTRON MAIN] Async server import notice:', err.message);
      });
    }
  } catch (e) {
    console.warn('[ELECTRON MAIN] Server start exception:', e.message);
  }
}

function createWindow() {
  try {
    mainWindow = new BrowserWindow({
      width: 1366,
      height: 768,
      minWidth: 1024,
      minHeight: 600,
      title: 'VITAS Iraq HRMS - Desktop Edition',
      autoHideMenuBar: true,
      show: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.mjs'),
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false
      }
    });

    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    console.log('[ELECTRON MAIN] Loading index HTML from:', indexPath);

    if (isDev) {
      mainWindow.loadURL('http://localhost:5173').catch(() => {
        mainWindow.loadFile(indexPath);
      });
    } else {
      mainWindow.loadFile(indexPath).catch(err => {
        console.error('[ELECTRON MAIN] Failed to load index.html:', err);
      });
    }

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  } catch (err) {
    console.error('[ELECTRON MAIN] Error creating window:', err);
  }
}

function setupTray() {
  try {
    const iconPath = path.join(__dirname, '..', 'assets', 'VitasLogo.jpeg');
    if (fs.existsSync(iconPath)) {
      tray = new Tray(iconPath);
      const contextMenu = Menu.buildFromTemplate([
        { label: 'فتح التطبيق (Open App)', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
        { type: 'separator' },
        { label: 'إغلاق النظام (Exit)', click: () => app.quit() }
      ]);
      tray.setToolTip('VITAS Iraq HRMS');
      tray.setContextMenu(contextMenu);
    }
  } catch (e) {}
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // 1. Create Window FIRST so user sees window instantly
    createWindow();
    setupTray();

    // 2. Launch Local Server non-blockingly in background
    startLocalServer().catch(err => {
      console.warn('[ELECTRON MAIN] Background server startup notice:', err);
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('get-app-version', () => app.getVersion());
