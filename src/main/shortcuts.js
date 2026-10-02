'use strict';
const { spawn } = require('child_process');
const path = require('path');
const log = require('./utils/logger');
class ShortcutManager {
  constructor() {
    this.monitor = null;
    this.callback = null;
    this.running = false;
    this.restartTimer = null;
  }
  start(onToggle) {
    if (this.running) return;
    this.callback = onToggle;
    this._spawn();
  }
  stop() {
    this.running = false;
    this.callback = null;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.monitor) {
      try {
        this.monitor.kill();
      } catch (_) {}
      this.monitor = null;
    }
    log.info('[Shortcuts] Stopped');
  }
  _spawn() {
    const scriptPath = path.join(__dirname, 'utils', 'keyboard-monitor.ps1');
    try {
      this.monitor = spawn('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-WindowStyle', 'Hidden',
        '-File', scriptPath
      ], {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      this.running = true;
      this.monitor.stdout.on('data', (data) => {
        const messages = data.toString().trim().split('\n');
        for (const msg of messages) {
          if (msg.trim() === 'TOGGLE' && this.callback) {
            log.info('[Shortcuts] Ctrl+E+F triggered');
            this.callback();
          }
        }
      });
      this.monitor.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg) log.warn('[Shortcuts] Monitor stderr:', msg);
      });
      this.monitor.on('error', (err) => {
        log.error('[Shortcuts] Monitor spawn error:', err.message);
        this._scheduleRestart();
      });
      this.monitor.on('exit', (code) => {
        log.info('[Shortcuts] Monitor exited, code:', code);
        if (this.callback) {
          this._scheduleRestart();
        }
      });
      log.info('[Shortcuts] Keyboard monitor started');
    } catch (err) {
      log.error('[Shortcuts] Failed to start monitor:', err.message);
      this._scheduleRestart();
    }
  }
  _scheduleRestart() {
    if (!this.callback) return;
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => {
      log.info('[Shortcuts] Restarting keyboard monitor...');
      this._spawn();
    }, 3000);
  }
}
module.exports = new ShortcutManager();
