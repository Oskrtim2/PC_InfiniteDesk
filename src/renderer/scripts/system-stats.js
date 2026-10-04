
export class SystemStats {
  constructor() {
    this.cpuRing = document.getElementById('cpu-ring');
    this.ramRing = document.getElementById('ram-ring');
    this.cpuValue = document.getElementById('cpu-value');
    this.ramValue = document.getElementById('ram-value');
    this.windowCount = document.getElementById('window-count');
    this.windowBadge = document.getElementById('window-badge');
    this.circumference = 2 * Math.PI * 50;
    this._cleanupListener = null;
  }
  init() {
    this.cpuRing.style.strokeDasharray = this.circumference;
    this.cpuRing.style.strokeDashoffset = this.circumference;
    this.ramRing.style.strokeDasharray = this.circumference;
    this.ramRing.style.strokeDashoffset = this.circumference;
    this._cleanupListener = window.infiniteDesk.onSystemStats((data) => {
      this.update(data);
    });
    this._fetchInitial();
  }
  async _fetchInitial() {
    try {
      const stats = await window.infiniteDesk.getSystemStats();
      if (stats) this.update(stats);
    } catch (_) {}
  }
  update(data) {
    if (!data) return;
    if (data.cpu) {
      const cpuPercent = Math.min(100, Math.max(0, data.cpu.usage));
      const cpuOffset = this.circumference - (cpuPercent / 100) * this.circumference;
      this.cpuRing.style.strokeDashoffset = cpuOffset;
      this.cpuValue.textContent = Math.round(cpuPercent);
      this._updateRingColor(this.cpuRing, cpuPercent, 'cpu');
    }
    if (data.memory) {
      const ramPercent = Math.min(100, Math.max(0, data.memory.percent));
      const ramOffset = this.circumference - (ramPercent / 100) * this.circumference;
      this.ramRing.style.strokeDashoffset = ramOffset;
      this.ramValue.textContent = Math.round(ramPercent);
      this._updateRingColor(this.ramRing, ramPercent, 'ram');
    }
  }
  updateWindowCount(count) {
    if (this.windowCount) {
      const current = parseInt(this.windowCount.textContent) || 0;
      if (current !== count) {
        this.windowCount.textContent = count;
        this.windowCount.style.animation = 'countUp 0.3s ease';
        setTimeout(() => {
          this.windowCount.style.animation = '';
        }, 300);
      }
    }
    if (this.windowBadge) {
      this.windowBadge.textContent = count;
    }
  }
  _updateRingColor(ring, percent, type) {
    let color;
    if (percent < 50) {
      color = type === 'cpu'
        ? 'var(--accent-blue)'
        : 'var(--accent-purple)';
    } else if (percent < 75) {
      color = 'var(--accent-amber)';
    } else {
      color = 'var(--accent-red)';
    }
    ring.style.stroke = color;
    if (percent < 50) {
      ring.style.filter = type === 'cpu'
        ? 'drop-shadow(0 0 6px var(--ring-cpu-glow))'
        : 'drop-shadow(0 0 6px var(--ring-ram-glow))';
    } else if (percent < 75) {
      ring.style.filter = 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.4))';
    } else {
      ring.style.filter = 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.4))';
    }
  }
  destroy() {
    if (this._cleanupListener) {
      this._cleanupListener();
    }
  }
}
