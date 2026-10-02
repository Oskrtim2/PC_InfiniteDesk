'use strict';
const { Tray, Menu, app } = require('electron');
const log = require('./utils/logger');
const iconGenerator = require('./utils/icon-generator');
class TrayManager {
  constructor() {
    this.tray = null;
    this.onToggle = null;
    this.onThemeToggle = null;
    this.onQuit = null;
  }
  create(callbacks = {}) {
    this.onToggle = callbacks.onToggle || null;
    this.onThemeToggle = callbacks.onThemeToggle || null;
    this.onQuit = callbacks.onQuit || null;
    try {
      const icon = iconGenerator.getTrayIcon();
      this.tray = new Tray(icon);
      this.tray.setToolTip('InfiniteDesk — Infinite Desktop Workspace');
      this._buildMenu();
      this.tray.on('double-click', () => {
        if (this.onToggle) this.onToggle();
      });
      log.info('[Tray] Created system tray icon');
    } catch (err) {
      log.error('[Tray] Failed to create tray:', err.message);
    }
  }
  _buildMenu() {
    if (!this.tray) return;
    const menu = Menu.buildFromTemplate([
      {
        label: 'InfiniteDesk',
        enabled: false,
        icon: null
      },
      { type: 'separator' },
      {
        label: 'Show / Hide Panel',
        accelerator: 'Ctrl+E+F',
        click: () => { if (this.onToggle) this.onToggle(); }
      },
      {
        label: 'Toggle Theme',
        click: () => { if (this.onThemeToggle) this.onThemeToggle(); }
      },
      { type: 'separator' },
      {
        label: 'Navigate Home',
        click: () => {
          if (this.onNavigateHome) this.onNavigateHome();
        }
      },
      { type: 'separator' },
      {
        label: 'About InfiniteDesk',
        click: () => {
          const { dialog } = require('electron');
          dialog.showMessageBox({
            type: 'info',
            title: 'About InfiniteDesk',
            message: 'InfiniteDesk v1.0.0',
            detail: 'Infinite Desktop Workspace Manager for Windows 11\n\nNavigate through unlimited virtual desktop zones.\n\nShortcut: Ctrl+E+F to toggle panel.',
            buttons: ['OK']
          });
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        accelerator: 'Alt+F4',
        click: () => {
          if (this.onQuit) this.onQuit();
          else app.quit();
        }
      }
    ]);
    this.tray.setContextMenu(menu);
  }
  updateTooltip(zoneInfo) {
    if (!this.tray) return;
    const zone = zoneInfo ? `Zone: ${zoneInfo.name} (${zoneInfo.x}, ${zoneInfo.y})` : '';
    this.tray.setToolTip(`InfiniteDesk${zone ? ' — ' + zone : ''}`);
  }
  destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
module.exports = new TrayManager();
