'use strict';
const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const log = require('./utils/logger');
const win32Bridge = require('./utils/win32-bridge');
const iconGenerator = require('./utils/icon-generator');
const shortcutManager = require('./shortcuts');
const trayManager = require('./tray');
const ipcHandlers = require('./ipc-handlers');
const systemMonitor = require('./services/system-monitor');
const windowTracker = require('./services/window-tracker');
const workspaceManager = require('./services/workspace-manager');
const navigation = require('./services/navigation');
const Store = require('./utils/store');
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  log.info('[Main] Another instance already running, quitting.');
  app.quit();
}

app.disableHardwareAcceleration();

let mainWindow = null;
let isExpanded = false;
let isQuitting = false;
let settingsStore = null;
function createMainWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;
  settingsStore = new Store('settings', {
    theme: 'light',
    bubblePosition: { x: screenW - 80, y: screenH - 80 },
    pollRate: 2000
  });
  const savedPos = settingsStore.get('bubblePosition', { x: screenW - 80, y: screenH - 80 });
  const windowIcon = iconGenerator.getWindowIcon();
  mainWindow = new BrowserWindow({
    x: Math.round((savedPos.x || screenW - 80) - 32),
    y: Math.round((savedPos.y || screenH - 80) - 32),
    width: 128,
    height: 128,
    useContentSize: true,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    icon: windowIcon,
    webPreferences: {
      preload: path.join(__dirname, '..', 'renderer', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: !app.isPackaged
    }
  });
  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      if (isExpanded) {
        togglePanel();
      }
    }
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  mainWindow.on('moved', () => {
    if (mainWindow && !isExpanded) {
      const bounds = mainWindow.getBounds();
      settingsStore.set('bubblePosition', { x: bounds.x + 32, y: bounds.y + 32 });
    }
  });
  if (!app.isPackaged || process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
  log.info('[Main] Window created');
  return mainWindow;
}
function setWindowExpandedState(expanded) {
  if (!mainWindow) return;
  if (expanded) {
    const bounds = mainWindow.getBounds();
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;
    let panelX = Math.max(10, bounds.x - 196);
    let panelY = Math.max(10, bounds.y - 650);
    if (panelX + 520 > screenW) panelX = screenW - 530;
    if (panelY + 780 > screenH) panelY = screenH - 790;
    if (panelX < 0) panelX = 10;
    if (panelY < 0) panelY = 10;
    
    mainWindow.setResizable(true);
    mainWindow.setBounds({
      x: panelX,
      y: panelY,
      width: 520,
      height: 780
    });
    mainWindow.setResizable(false);
    mainWindow.setSkipTaskbar(false);
  } else {
    const bounds = mainWindow.getBounds();
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;
    
    let targetX = bounds.x + 196;
    let targetY = bounds.y + 650;
    
    if (targetX < 0) targetX = 10;
    if (targetY < 0) targetY = 10;
    if (targetX + 128 > screenW) targetX = screenW - 138;
    if (targetY + 128 > screenH) targetY = screenH - 138;

    settingsStore.set('bubblePosition', { x: targetX + 32, y: targetY + 32 });
    
    mainWindow.setResizable(true);
    mainWindow.setBounds({
      x: Math.round(targetX),
      y: Math.round(targetY),
      width: 128,
      height: 128
    });
    mainWindow.setResizable(false);
    mainWindow.setSkipTaskbar(true);
  }
}

function togglePanel() {
  if (!mainWindow) return;
  isExpanded = !isExpanded;
  setWindowExpandedState(isExpanded);
  mainWindow.webContents.send('toggle-panel', isExpanded);
  log.info(`[Main] Panel ${isExpanded ? 'expanded' : 'collapsed'}`);
}
app.whenReady().then(async () => {
  log.info('[Main] App ready, initializing...');
  try {
    await win32Bridge.init();
  } catch (err) {
    log.error('[Main] Win32Bridge init failed:', err.message);
  }
  workspaceManager.init();
  const win = createMainWindow();
  
  win.on('set-expanded-from-renderer', (expanded) => {
    isExpanded = expanded;
    setWindowExpandedState(expanded);
    log.info(`[Main] Panel ${isExpanded ? 'expanded' : 'collapsed'} from renderer`);
  });

  ipcHandlers.registerHandlers(win);
  trayManager.create({
    onToggle: () => togglePanel(),
    onThemeToggle: () => {
      const Store2 = require('./utils/store');
      const s = new Store2('settings', { theme: 'light' });
      const current = s.get('theme', 'light');
      const next = current === 'light' ? 'dark' : 'light';
      s.set('theme', next);
      ipcHandlers.sendThemeChange(next);
    },
    onQuit: () => {
      isQuitting = true;
      app.quit();
    }
  });
  trayManager.onNavigateHome = async () => {
    await navigation.navigateDirection('home');
  };
  shortcutManager.start(() => togglePanel());
  systemMonitor.start((data) => {
    ipcHandlers.sendSystemStats(data);
  }, 2000);
  windowTracker.start({
    onChange: (windows) => {
      ipcHandlers.sendWindowsUpdate(windows);
    },
    onNew: (win) => {
      workspaceManager.assignWindowToCurrentZone(win.hwnd);
      log.debug(`[Main] New window assigned to current zone: ${win.title}`);
    },
    onClosed: (hwnd) => {
      workspaceManager.removeWindow(hwnd);
      log.debug(`[Main] Window removed from tracking: ${hwnd}`);
    }
  });
  navigation.onNavigated = (prev, current) => {
    const info = workspaceManager.getCurrentZoneInfo();
    trayManager.updateTooltip(info);
  };
  log.info('[Main] All services started successfully');
});
app.on('second-instance', () => {
  if (mainWindow) {
    if (!isExpanded) togglePanel();
    mainWindow.focus();
  }
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
  }
});
app.on('before-quit', () => {
  isQuitting = true;
  log.info('[Main] Shutting down...');
  shortcutManager.stop();
  systemMonitor.stop();
  windowTracker.stop();
  win32Bridge.destroy();
  trayManager.destroy();
  log.info('[Main] Cleanup complete');
});
process.on('uncaughtException', (err) => {
  log.error('[Main] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  log.error('[Main] Unhandled rejection:', reason);
});
