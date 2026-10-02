'use strict';
const log = require('../utils/logger');
const workspaceManager = require('./workspace-manager');
const windowTracker = require('./window-tracker');
class Navigation {
  constructor() {
    this.isNavigating = false;
    this.onNavigated = null;
  }
  async switchToZone(x, y) {
    if (this.isNavigating) {
      log.warn('[Navigation] Already navigating, ignoring request');
      return null;
    }
    const current = workspaceManager.getCurrentZone();
    const currentKey = workspaceManager.getZoneKey(current.x, current.y);
    const targetKey = workspaceManager.getZoneKey(x, y);
    if (currentKey === targetKey) return null;
    this.isNavigating = true;
    log.info(`[Navigation] Switching: ${currentKey} → ${targetKey}`);
    try {
      const currentWindows = workspaceManager.getWindowsInCurrentZone();
      const hidePromises = currentWindows.map(hwnd =>
        windowTracker.hideWindow(hwnd).catch(err =>
          log.warn(`[Navigation] Failed to hide ${hwnd}:`, err.message)
        )
      );
      await Promise.all(hidePromises);
      const nav = workspaceManager.navigateTo(x, y);
      const targetWindows = workspaceManager.getWindowsInZone(x, y);
      const showPromises = targetWindows.map(hwnd =>
        windowTracker.showWindow(hwnd).catch(err =>
          log.warn(`[Navigation] Failed to show ${hwnd}:`, err.message)
        )
      );
      await Promise.all(showPromises);
      if (this.onNavigated) {
        this.onNavigated(nav.prev, nav.current);
      }
      log.info(`[Navigation] Switched to zone (${x}, ${y})`);
      return nav;
    } catch (err) {
      log.error('[Navigation] Switch error:', err.message);
      return null;
    } finally {
      this.isNavigating = false;
    }
  }
  async navigateDirection(direction) {
    const current = workspaceManager.getCurrentZone();
    const deltas = {
      up:    { dx: 0,  dy: -1 },
      down:  { dx: 0,  dy: 1  },
      left:  { dx: -1, dy: 0  },
      right: { dx: 1,  dy: 0  },
      home:  { dx: -current.x, dy: -current.y }
    };
    const d = deltas[direction];
    if (!d) {
      log.warn('[Navigation] Unknown direction:', direction);
      return null;
    }
    return this.switchToZone(current.x + d.dx, current.y + d.dy);
  }
  async moveWindowToZone(hwnd, targetX, targetY) {
    const currentZone = workspaceManager.getCurrentZone();
    const targetKey = workspaceManager.getZoneKey(targetX, targetY);
    const isTargetCurrent = targetX === currentZone.x && targetY === currentZone.y;
    workspaceManager.assignWindow(hwnd, targetX, targetY);
    if (!isTargetCurrent) {
      await windowTracker.hideWindow(hwnd);
    } else {
      await windowTracker.showWindow(hwnd);
    }
    log.info(`[Navigation] Moved window ${hwnd} to zone (${targetX}, ${targetY})`);
  }
  get busy() {
    return this.isNavigating;
  }
}
module.exports = new Navigation();
