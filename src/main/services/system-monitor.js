'use strict';
const si = require('systeminformation');
const log = require('../utils/logger');
class SystemMonitor {
  constructor() {
    this.interval = null;
    this.pollRate = 2000;
    this.callback = null;
    this.lastData = {
      cpu: { usage: 0, model: '', cores: 0, speed: 0 },
      memory: { used: 0, total: 0, percent: 0, free: 0 },
      uptime: 0
    };
  }
  start(onData, pollRate) {
    if (pollRate) this.pollRate = pollRate;
    this.callback = onData;
    this._poll();
    this.interval = setInterval(() => this._poll(), this.pollRate);
    log.info(`[SystemMonitor] Started (${this.pollRate}ms interval)`);
  }
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.callback = null;
    log.info('[SystemMonitor] Stopped');
  }
  setPollRate(ms) {
    this.pollRate = Math.max(500, ms);
    if (this.interval && this.callback) {
      this.stop();
      this.start(this.callback, this.pollRate);
    }
  }
  getLastData() {
    return { ...this.lastData };
  }
  async _poll() {
    try {
      const [cpuLoad, mem, time] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.time()
      ]);
      this.lastData = {
        cpu: {
          usage: Math.round(cpuLoad.currentLoad * 10) / 10,
          cores: cpuLoad.cpus ? cpuLoad.cpus.length : 0,
          perCore: cpuLoad.cpus
            ? cpuLoad.cpus.map(c => Math.round(c.load * 10) / 10)
            : []
        },
        memory: {
          used: mem.active,
          total: mem.total,
          free: mem.available,
          percent: Math.round((mem.active / mem.total) * 1000) / 10,
          usedGB: Math.round(mem.active / (1024 ** 3) * 10) / 10,
          totalGB: Math.round(mem.total / (1024 ** 3) * 10) / 10
        },
        uptime: time.uptime
      };
      if (this.callback) {
        this.callback(this.lastData);
      }
    } catch (err) {
      log.error('[SystemMonitor] Poll error:', err.message);
    }
  }
  async getFullSystemInfo() {
    try {
      const [cpu, mem, os, graphics] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.osInfo(),
        si.graphics()
      ]);
      return {
        cpu: {
          manufacturer: cpu.manufacturer,
          brand: cpu.brand,
          speed: cpu.speed,
          cores: cpu.cores,
          physicalCores: cpu.physicalCores
        },
        memory: {
          total: mem.total,
          totalGB: Math.round(mem.total / (1024 ** 3) * 10) / 10
        },
        os: {
          platform: os.platform,
          distro: os.distro,
          release: os.release,
          arch: os.arch,
          hostname: os.hostname
        },
        displays: graphics.displays
          ? graphics.displays.map(d => ({
              model: d.model,
              resolution: `${d.resolutionX}x${d.resolutionY}`,
              size: d.currentResX ? `${d.currentResX}x${d.currentResY}` : null
            }))
          : []
      };
    } catch (err) {
      log.error('[SystemMonitor] Full info error:', err.message);
      return null;
    }
  }
}
module.exports = new SystemMonitor();
