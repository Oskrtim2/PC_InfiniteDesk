'use strict';
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const log = require('./logger');
class Store {
  constructor(name, defaults = {}) {
    this.filePath = path.join(app.getPath('userData'), `${name}.json`);
    this.defaults = defaults;
    this.data = { ...defaults };
    this._load();
  }
  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        this.data = { ...this.defaults, ...parsed };
      }
    } catch (err) {
      log.warn(`[Store] Failed to load ${this.filePath}:`, err.message);
      this.data = { ...this.defaults };
    }
  }
  _save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = this.filePath + '.tmp';
      fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      log.error(`[Store] Failed to save ${this.filePath}:`, err.message);
    }
  }
  get(key, defaultValue = undefined) {
    const keys = key.split('.');
    let current = this.data;
    for (const k of keys) {
      if (current == null || typeof current !== 'object') return defaultValue;
      current = current[k];
    }
    return current !== undefined ? current : defaultValue;
  }
  set(key, value) {
    const keys = key.split('.');
    let current = this.data;
    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]] == null || typeof current[keys[i]] !== 'object') {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    this._save();
    return this;
  }
  delete(key) {
    const keys = key.split('.');
    let current = this.data;
    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]] == null) return this;
      current = current[keys[i]];
    }
    delete current[keys[keys.length - 1]];
    this._save();
    return this;
  }
  getAll() {
    return { ...this.data };
  }
  reset() {
    this.data = { ...this.defaults };
    this._save();
    return this;
  }
}
module.exports = Store;
