'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('infiniteDesk', {
  getPanelState: () => ipcRenderer.invoke('get-panel-state'),
  setExpanded: (expanded) => ipcRenderer.invoke('set-expanded', expanded),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  toggleTheme: () => ipcRenderer.invoke('toggle-theme'),
  getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getWindows: () => ipcRenderer.invoke('get-windows'),
  getWindowCount: () => ipcRenderer.invoke('get-window-count'),
  focusWindow: (hwnd) => ipcRenderer.invoke('focus-window', hwnd),
  minimizeWindow: (hwnd) => ipcRenderer.invoke('minimize-window', hwnd),
  moveWindowToZone: (hwnd, x, y) => ipcRenderer.invoke('move-window-to-zone', hwnd, x, y),
  getWorkspaceState: () => ipcRenderer.invoke('get-workspace-state'),
  navigate: (direction) => ipcRenderer.invoke('navigate', direction),
  navigateToZone: (x, y) => ipcRenderer.invoke('navigate-to-zone', x, y),
  getGridData: () => ipcRenderer.invoke('get-grid-data'),
  setZoneName: (x, y, name) => ipcRenderer.invoke('set-zone-name', x, y, name),
  saveBubblePosition: (x, y) => ipcRenderer.invoke('save-bubble-position', x, y),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  onSystemStats: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('system-stats-update', handler);
    return () => ipcRenderer.removeListener('system-stats-update', handler);
  },
  onWindowsUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('windows-update', handler);
    return () => ipcRenderer.removeListener('windows-update', handler);
  },
  onStateUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('state-update', handler);
    return () => ipcRenderer.removeListener('state-update', handler);
  },
  onThemeChanged: (callback) => {
    const handler = (_event, theme) => callback(theme);
    ipcRenderer.on('theme-changed', handler);
    return () => ipcRenderer.removeListener('theme-changed', handler);
  },
  onTogglePanel: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('toggle-panel', handler);
    return () => ipcRenderer.removeListener('toggle-panel', handler);
  }
});
