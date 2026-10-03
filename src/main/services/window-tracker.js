'use strict';
const win32 = require('../utils/win32-bridge');
const log = require('../utils/logger');
const EXCLUDED_PROCESSES = new Set([
  'explorer', 'dwm', 'csrss', 'lsass', 'svchost', 'wininit',
  'winlogon', 'services', 'fontdrvhost', 'taskhostw', 'ctfmon',
  'runtimebroker', 'searchhost', 'startmenuexperiencehost',
  'shellexperiencehost', 'textinputhost', 'lockapp',
  'systemsettings', 'applicationframehost', 'widgetservice',
  'infinitedesk'
]);
class WindowTracker {
  constructor() {
    this.windows = new Map();
    this.interval = null;
    this.pollRate = 2000;
    this.onWindowsChanged = null;
    this.onNewWindow = null;
    this.onWindowClosed = null;
    this.hiddenWindows = new Set();
  }
  start(callbacks = {}) {
    this.onWindowsChanged = callbacks.onChange || null;
    this.onNewWindow = callbacks.onNew || null;
    this.onWindowClosed = callbacks.onClosed || null;
    this._poll();
    this.interval = setInterval(() => this._poll(), this.pollRate);
    log.info(`[WindowTracker] Started (${this.pollRate}ms interval)`);
  }
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    log.info('[WindowTracker] Stopped');
  }
  getWindows() {
    return [...this.windows.values()].filter(w => !this.hiddenWindows.has(w.hwnd));
  }
  getAllWindows() {
    return [...this.windows.values()];
  }
  getVisibleCount() {
    return this.getWindows().length;
  }
  getTotalCount() {
    return this.windows.size;
  }
  async _poll() {
    try {
      const current = await win32.getOpenWindows();
      const currentMap = new Map();
      const newWindows = [];
      const closedHwnds = [];
      for (const win of current) {
        if (EXCLUDED_PROCESSES.has(win.name.toLowerCase())) continue;
        if (!win.title || win.title.trim() === '') continue;
        currentMap.set(win.hwnd, {
          hwnd: win.hwnd,
          pid: win.pid,
          name: win.name,
          title: win.title,
          x: win.x,
          y: win.y,
          width: win.width,
          height: win.height,
          minimized: win.minimized || false,
          maximized: win.maximized || false,
          hidden: this.hiddenWindows.has(win.hwnd)
        });
        if (!this.windows.has(win.hwnd)) {
          newWindows.push(currentMap.get(win.hwnd));
        }
      }
      for (const [hwnd, info] of this.windows) {
        if (!currentMap.has(hwnd) && !this.hiddenWindows.has(hwnd)) {
          closedHwnds.push(hwnd);
        }
      }
      const hasChanges = newWindows.length > 0 || closedHwnds.length > 0;
      for (const hwnd of closedHwnds) {
        this.windows.delete(hwnd);
        this.hiddenWindows.delete(hwnd);
        if (this.onWindowClosed) this.onWindowClosed(hwnd);
      }
      for (const [hwnd, info] of currentMap) {
        this.windows.set(hwnd, info);
      }
      for (const win of newWindows) {
        if (this.onNewWindow) this.onNewWindow(win);
      }
      if (hasChanges && this.onWindowsChanged) {
        this.onWindowsChanged(this.getWindows());
      }
    } catch (err) {
      log.error('[WindowTracker] Poll error:', err.message);
    }
  }
  async hideWindow(hwnd) {
    this.hiddenWindows.add(hwnd);
    await win32.hideWindow(hwnd);
    log.debug(`[WindowTracker] Hidden window ${hwnd}`);
  }
  async showWindow(hwnd) {
    this.hiddenWindows.delete(hwnd);
    await win32.showWindow(hwnd);
    log.debug(`[WindowTracker] Shown window ${hwnd}`);
  }
  async moveWindow(hwnd, x, y, width, height) {
    await win32.moveWindow(hwnd, x, y, width, height);
  }
  async focusWindow(hwnd) {
    await win32.focusWindow(hwnd);
  }
  async minimizeWindow(hwnd) {
    await win32.minimizeWindow(hwnd);
  }
  async restoreWindow(hwnd) {
    await win32.restoreWindow(hwnd);
  }
}
module.exports = new WindowTracker();
