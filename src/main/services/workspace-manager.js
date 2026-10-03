'use strict';
const log = require('../utils/logger');
const Store = require('../utils/store');
class WorkspaceManager {
  constructor() {
    this.store = null;
    this.currentZone = { x: 0, y: 0 };
    this.zones = new Map();
    this.windowZoneMap = new Map();
    this.onZoneChanged = null;
  }
  init() {
    this.store = new Store('workspaces', {
      currentZone: { x: 0, y: 0 },
      zoneNames: {},
      zoneColors: {}
    });
    this.currentZone = this.store.get('currentZone', { x: 0, y: 0 });
    this._ensureZone(0, 0);
    const names = this.store.get('zoneNames', {});
    const colors = this.store.get('zoneColors', {});
    for (const key of Object.keys(names)) {
      this._ensureZone(...key.split(',').map(Number));
      this.zones.get(key).name = names[key];
    }
    for (const key of Object.keys(colors)) {
      this._ensureZone(...key.split(',').map(Number));
      this.zones.get(key).color = colors[key];
    }
    log.info('[WorkspaceManager] Initialized at zone', this.getZoneKey());
  }
  getZoneKey(x, y) {
    if (x === undefined) return `${this.currentZone.x},${this.currentZone.y}`;
    return `${x},${y}`;
  }
  parseZoneKey(key) {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  }
  _ensureZone(x, y) {
    const key = this.getZoneKey(x, y);
    if (!this.zones.has(key)) {
      this.zones.set(key, {
        windows: new Set(),
        name: this._getDefaultName(x, y),
        color: null
      });
    }
  }
  _getDefaultName(x, y) {
    if (x === 0 && y === 0) return 'Home';
    const dirs = [];
    if (y < 0) dirs.push('North');
    if (y > 0) dirs.push('South');
    if (x < 0) dirs.push('West');
    if (x > 0) dirs.push('East');
    return dirs.join('-') || 'Home';
  }
  _getDirectionLabel(x, y) {
    if (x === 0 && y === 0) return '⌂';
    const parts = [];
    if (y < 0) parts.push('↑');
    if (y > 0) parts.push('↓');
    if (x < 0) parts.push('←');
    if (x > 0) parts.push('→');
    return parts.join('');
  }
  getCurrentZone() {
    return { ...this.currentZone };
  }
  getCurrentZoneInfo() {
    const key = this.getZoneKey();
    this._ensureZone(this.currentZone.x, this.currentZone.y);
    const zone = this.zones.get(key);
    return {
      x: this.currentZone.x,
      y: this.currentZone.y,
      key,
      name: zone.name,
      color: zone.color,
      windowCount: zone.windows.size,
      direction: this._getDirectionLabel(this.currentZone.x, this.currentZone.y)
    };
  }
  navigateTo(x, y) {
    const prevZone = { ...this.currentZone };
    this.currentZone = { x, y };
    this._ensureZone(x, y);
    this.store.set('currentZone', this.currentZone);
    log.info(`[WorkspaceManager] Navigated: (${prevZone.x},${prevZone.y}) → (${x},${y})`);
    return { prev: prevZone, current: this.currentZone };
  }
  navigate(direction) {
    const deltas = {
      up:    { dx: 0,  dy: -1 },
      down:  { dx: 0,  dy: 1  },
      left:  { dx: -1, dy: 0  },
      right: { dx: 1,  dy: 0  },
      home:  { dx: -this.currentZone.x, dy: -this.currentZone.y }
    };
    const d = deltas[direction];
    if (!d) return null;
    return this.navigateTo(this.currentZone.x + d.dx, this.currentZone.y + d.dy);
  }
  assignWindowToCurrentZone(hwnd) {
    return this.assignWindow(hwnd, this.currentZone.x, this.currentZone.y);
  }
  assignWindow(hwnd, x, y) {
    const prevKey = this.windowZoneMap.get(hwnd);
    if (prevKey && this.zones.has(prevKey)) {
      this.zones.get(prevKey).windows.delete(hwnd);
    }
    const key = this.getZoneKey(x, y);
    this._ensureZone(x, y);
    this.zones.get(key).windows.add(hwnd);
    this.windowZoneMap.set(hwnd, key);
    return key;
  }
  removeWindow(hwnd) {
    const key = this.windowZoneMap.get(hwnd);
    if (key && this.zones.has(key)) {
      this.zones.get(key).windows.delete(hwnd);
    }
    this.windowZoneMap.delete(hwnd);
  }
  getWindowZone(hwnd) {
    const key = this.windowZoneMap.get(hwnd);
    return key ? this.parseZoneKey(key) : null;
  }
  getWindowZoneKey(hwnd) {
    return this.windowZoneMap.get(hwnd) || null;
  }
  getWindowsInZone(x, y) {
    const key = this.getZoneKey(x, y);
    return this.zones.has(key) ? [...this.zones.get(key).windows] : [];
  }
  getWindowsInCurrentZone() {
    return this.getWindowsInZone(this.currentZone.x, this.currentZone.y);
  }
  setZoneName(x, y, name) {
    const key = this.getZoneKey(x, y);
    this._ensureZone(x, y);
    this.zones.get(key).name = name;
    const names = this.store.get('zoneNames', {});
    names[key] = name;
    this.store.set('zoneNames', names);
  }
  setZoneColor(x, y, color) {
    const key = this.getZoneKey(x, y);
    this._ensureZone(x, y);
    this.zones.get(key).color = color;
    const colors = this.store.get('zoneColors', {});
    colors[key] = color;
    this.store.set('zoneColors', colors);
  }
  getGridData(radius = 2) {
    const grid = [];
    const cx = this.currentZone.x;
    const cy = this.currentZone.y;
    for (let dy = -radius; dy <= radius; dy++) {
      const row = [];
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        const key = this.getZoneKey(x, y);
        const zone = this.zones.get(key);
        row.push({
          x, y, key,
          isCurrent: dx === 0 && dy === 0,
          isHome: x === 0 && y === 0,
          hasWindows: zone ? zone.windows.size > 0 : false,
          windowCount: zone ? zone.windows.size : 0,
          name: zone ? zone.name : this._getDefaultName(x, y),
          color: zone ? zone.color : null,
          direction: this._getDirectionLabel(x, y)
        });
      }
      grid.push(row);
    }
    return {
      grid,
      current: this.getCurrentZoneInfo(),
      activeZones: this.getActiveZones()
    };
  }
  getActiveZones() {
    const active = [];
    for (const [key, zone] of this.zones) {
      if (zone.windows.size > 0) {
        const { x, y } = this.parseZoneKey(key);
        active.push({
          x, y, key,
          name: zone.name,
          color: zone.color,
          windowCount: zone.windows.size,
          isCurrent: x === this.currentZone.x && y === this.currentZone.y
        });
      }
    }
    return active;
  }
  getState() {
    return {
      currentZone: this.getCurrentZoneInfo(),
      gridData: this.getGridData(),
      activeZones: this.getActiveZones(),
      totalWindows: [...this.windowZoneMap.keys()].length
    };
  }
}
module.exports = new WorkspaceManager();
