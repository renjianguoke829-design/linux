const path = require('path');
const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen } = require('electron');

let mainWindow;
let trayWindow;
let tray;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'renderer/index.html')}`;
  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

function createTrayWindow() {
  trayWindow = new BrowserWindow({
    width: 320,
    height: 400,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    resizable: false,
    transparent: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const trayUrl = process.env.TRAY_PANEL_URL || `file://${path.join(__dirname, 'tray-panel/index.html')}`;
  trayWindow.loadURL(trayUrl);

  trayWindow.on('blur', () => {
    if (trayWindow && trayWindow.isVisible()) {
      trayWindow.hide();
    }
  });
}

function calculateTrayPosition() {
  const trayBounds = tray.getBounds();
  const windowBounds = trayWindow.getBounds();
  const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });

  const isTopBar = trayBounds.y < display.workArea.y + display.workArea.height / 2;
  const x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2);
  const y = isTopBar
    ? Math.round(trayBounds.y + trayBounds.height + 8)
    : Math.round(trayBounds.y - windowBounds.height - 8);

  const clampedX = Math.max(display.workArea.x + 8, Math.min(x, display.workArea.x + display.workArea.width - windowBounds.width - 8));
  const clampedY = Math.max(display.workArea.y + 8, Math.min(y, display.workArea.y + display.workArea.height - windowBounds.height - 8));

  return { x: clampedX, y: clampedY };
}

function toggleTrayWindow() {
  if (!trayWindow) return;

  if (trayWindow.isVisible()) {
    trayWindow.hide();
    return;
  }

  const pos = calculateTrayPosition();
  trayWindow.setPosition(pos.x, pos.y, false);
  trayWindow.show();
  trayWindow.focus();
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip('Production System Console');

  tray.on('click', () => {
    toggleTrayWindow();
  });

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示/隐藏主窗口',
      click: () => {
        if (!mainWindow) return;
        if (mainWindow.isVisible()) mainWindow.hide();
        else mainWindow.show();
      },
    },
    {
      label: '退出',
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);
}

function registerTrayIpc() {
  ipcMain.handle('tray:getStats', async () => {
    return {
      todayOutput: 0,
      currentStage: '待启动',
      latestCardTitle: '暂无数据',
    };
  });

  ipcMain.handle('tray:getServices', async () => {
    return [
      { name: 'PostgreSQL', online: false },
      { name: 'Docker', online: false },
      { name: 'Ollama', online: false },
    ];
  });

  ipcMain.handle('tray:openMain', async (_event, targetModule) => {
    if (!mainWindow) return { ok: false };
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
    if (targetModule) {
      mainWindow.webContents.send('main:navigate', targetModule);
    }
    if (trayWindow && trayWindow.isVisible()) trayWindow.hide();
    return { ok: true };
  });

  ipcMain.handle('tray:startPipeline', async () => {
    if (mainWindow) {
      mainWindow.webContents.send('pipeline:start-quick');
    }
    return { ok: true };
  });
}

app.whenReady().then(() => {
  createMainWindow();
  createTrayWindow();
  createTray();
  registerTrayIpc();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      createTrayWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
