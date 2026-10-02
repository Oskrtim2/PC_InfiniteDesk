'use strict';
const { ipcMain } = require('electron');
const log = require('./utils/logger');
const systemMonitor = require('./services/system-monitor');
const windowTracker = require('./services/window-tracker');
const workspaceManager = require('./services/workspace-manager');
const navigation = require('./services/navigation');
const Store = require('./utils/store');
let mainWindow = null;
let settingsStore = null;
function registerHandlers(win) {
  mainWindow = win;
  settingsStore = new Store('settings', {
    theme: 'light',
    bubblePosition: { x: null, y: null },
    pollRate: 2000,
    showOnStartup: false
  });
  ipcMain.handle('get-panel-state', () => {
    return {
      theme: settingsStore.get('theme', 'light'),
      bubblePosition: settingsStore.get('bubblePosition'),
    };
  });
  ipcMain.handle('set-expanded', (_event, expanded) => {
    if (!mainWindow) return;
    mainWindow.emit('set-expanded-from-renderer', expanded);
  });
  ipcMain.handle('get-theme', () => {
    return settingsStore.get('theme', 'light');
  });
  ipcMain.handle('set-theme', (_event, theme) => {
    settingsStore.set('theme', theme);
    return theme;
  });
  ipcMain.handle('toggle-theme', () => {
    const current = settingsStore.get('theme', 'light');
    const next = current === 'light' ? 'dark' : 'light';
    settingsStore.set('theme', next);
    return next;
  });
  ipcMain.handle('get-system-stats', () => {
    return systemMonitor.getLastData();
  });
  ipcMain.handle('get-system-info', async () => {
    return systemMonitor.getFullSystemInfo();
  });
  ipcMain.handle('get-windows', () => {
    const windows = windowTracker.getAllWindows();
    return windows.map(w => ({
      ...w,
      zone: workspaceManager.getWindowZone(w.hwnd),
      zoneKey: workspaceManager.getWindowZoneKey(w.hwnd)
    }));
  });
  ipcMain.handle('get-window-count', () => {
    return windowTracker.getTotalCount();
  });
  ipcMain.handle('focus-window', async (_event, hwnd) => {
    try {
      await windowTracker.focusWindow(hwnd);
      return true;
    } catch (err) {
      log.error('[IPC] focus-window error:', err.message);
      return false;
    }
  });
  ipcMain.handle('minimize-window', async (_event, hwnd) => {
    try {
      await windowTracker.minimizeWindow(hwnd);
      return true;
    } catch (err) {
      return false;
    }
  });
  ipcMain.handle('move-window-to-zone', async (_event, hwnd, x, y) => {
    try {
      await navigation.moveWindowToZone(hwnd, x, y);
      _sendUpdate();
      return true;
    } catch (err) {
      log.error('[IPC] move-window-to-zone error:', err.message);
      return false;
    }
  });
  ipcMain.handle('get-workspace-state', () => {
    return workspaceManager.getState();
  });
  ipcMain.handle('navigate', async (_event, direction) => {
    const result = await navigation.navigateDirection(direction);
    if (result) _sendUpdate();
    return result;
  });
  ipcMain.handle('navigate-to-zone', async (_event, x, y) => {
    const result = await navigation.switchToZone(x, y);
    if (result) _sendUpdate();
    return result;
  });
  ipcMain.handle('get-grid-data', () => {
    return workspaceManager.getGridData();
  });
  ipcMain.handle('set-zone-name', (_event, x, y, name) => {
    workspaceManager.setZoneName(x, y, name);
    return true;
  });
  ipcMain.handle('save-bubble-position', (_event, x, y) => {
    settingsStore.set('bubblePosition', { x, y });
    if (mainWindow) {
      mainWindow.setBounds({ x: Math.round(x), y: Math.round(y), width: 128, height: 128 });
    }
    return true;
  });
  ipcMain.handle('get-settings', () => {
    return settingsStore.getAll();
  });
  ipcMain.handle('set-setting', (_event, key, value) => {
    settingsStore.set(key, value);
    return true;
  });
  log.info('[IPC] All handlers registered');
}
function _sendUpdate() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const state = workspaceManager.getState();
    const windows = windowTracker.getAllWindows().map(w => ({
      ...w,
      zone: workspaceManager.getWindowZone(w.hwnd),
      zoneKey: workspaceManager.getWindowZoneKey(w.hwnd)
    }));
    mainWindow.webContents.send('state-update', { workspace: state, windows });
  } catch (err) {
    log.error('[IPC] sendUpdate error:', err.message);
  }
}
function sendSystemStats(data) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    mainWindow.webContents.send('system-stats-update', data);
  } catch (_) {}
}
function sendWindowsUpdate(windows) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const enriched = windows.map(w => ({
      ...w,
      zone: workspaceManager.getWindowZone(w.hwnd),
      zoneKey: workspaceManager.getWindowZoneKey(w.hwnd)
    }));
    mainWindow.webContents.send('windows-update', enriched);
  } catch (_) {}
}
function sendThemeChange(theme) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    mainWindow.webContents.send('theme-changed', theme);
  } catch (_) {}
}
module.exports = {
  registerHandlers,
  sendSystemStats,
  sendWindowsUpdate,
  sendThemeChange
};
