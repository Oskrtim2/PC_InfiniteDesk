
export class WindowList {
  constructor() {
    this.container = document.getElementById('window-list');
    this.windows = [];
    this._cleanupListener = null;
  }
  init() {
    this._cleanupListener = window.infiniteDesk.onWindowsUpdate((windows) => {
      this.windows = windows || [];
      this.render();
    });
    this._fetch();
  }
  async _fetch() {
    try {
      this.windows = await window.infiniteDesk.getWindows();
      this.render();
    } catch (err) {
      console.error('[WindowList] Fetch error:', err);
    }
  }
  render() {
    if (!this.container) return;
    if (!this.windows || this.windows.length === 0) {
      this.container.innerHTML = `
        <div class="window-list-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <path d="M8 21h8M12 17v4"/>
          </svg>
          <span>No windows tracked</span>
        </div>
      `;
      return;
    }
    const grouped = this._groupByZone(this.windows);
    const fragment = document.createDocumentFragment();
    for (const [zoneKey, windows] of grouped) {
      if (grouped.size > 1) {
        const header = document.createElement('div');
        header.className = 'window-group-header';
        header.style.cssText = `
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          padding: 6px 4px 2px;
          display: flex;
          align-items: center;
          gap: 6px;
        `;
        const zone = windows[0]?.zone;
        const zoneName = zone ? `${this._getDirectionLabel(zone.x, zone.y)}` : 'Unassigned';
        const coords = zone ? `(${zone.x}, ${zone.y})` : '';
        header.innerHTML = `
          <span style="color: var(--accent-blue)">${zoneName}</span>
          <span style="opacity: 0.5">${coords}</span>
          <span style="margin-left: auto; font-size: 9px; opacity: 0.4">${windows.length}</span>
        `;
        fragment.appendChild(header);
      }
      windows.forEach((win, idx) => {
        const item = this._createWindowItem(win, idx);
        fragment.appendChild(item);
      });
    }
    this.container.innerHTML = '';
    this.container.appendChild(fragment);
  }
  _createWindowItem(win, index) {
    const item = document.createElement('div');
    item.className = 'window-item';
    item.style.animationDelay = `${index * 0.04}s`;
    const initial = (win.name || '?').charAt(0).toUpperCase();
    const zone = win.zone;
    const zoneLabel = zone
      ? `${this._getDirectionLabel(zone.x, zone.y)} (${zone.x},${zone.y})`
      : 'Current';
    const title = this._truncateTitle(win.title, 32);
    item.innerHTML = `
      <div class="window-item-icon">${initial}</div>
      <div class="window-item-info">
        <div class="window-item-title" title="${this._escapeHtml(win.title)}">${this._escapeHtml(title)}</div>
        <div class="window-item-meta">
          <span>${win.name}</span>
          <span class="window-item-zone">${zoneLabel}</span>
          ${win.minimized ? '<span style="opacity:0.5">▁ min</span>' : ''}
        </div>
      </div>
      <div class="window-item-actions">
        <button class="window-action-btn" data-action="focus" title="Focus window" aria-label="Focus window">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
          </svg>
        </button>
        <button class="window-action-btn" data-action="minimize" title="Minimize" aria-label="Minimize window">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
    `;
    item.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        e.stopPropagation();
        const action = actionBtn.dataset.action;
        this._handleAction(action, win);
      } else {
        this._handleAction('focus', win);
      }
    });
    return item;
  }
  async _handleAction(action, win) {
    try {
      switch (action) {
        case 'focus':
          await window.infiniteDesk.focusWindow(win.hwnd);
          break;
        case 'minimize':
          await window.infiniteDesk.minimizeWindow(win.hwnd);
          break;
      }
    } catch (err) {
      console.error(`[WindowList] Action '${action}' failed:`, err);
    }
  }
  _groupByZone(windows) {
    const groups = new Map();
    for (const win of windows) {
      const key = win.zoneKey || 'unassigned';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(win);
    }
    return groups;
  }
  _getDirectionLabel(x, y) {
    if (x === 0 && y === 0) return '⌂ Home';
    const parts = [];
    if (y < 0) parts.push('↑N');
    if (y > 0) parts.push('↓S');
    if (x < 0) parts.push('←W');
    if (x > 0) parts.push('→E');
    return parts.join(' ');
  }
  _truncateTitle(title, maxLen) {
    if (!title) return '';
    return title.length > maxLen ? title.substring(0, maxLen - 1) + '…' : title;
  }
  _escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  getCount() {
    return this.windows.length;
  }
  async refresh() {
    await this._fetch();
  }
  destroy() {
    if (this._cleanupListener) {
      this._cleanupListener();
    }
  }
}
