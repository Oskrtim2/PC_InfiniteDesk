
import { ThemeManager } from './theme-manager.js';
import { UIController } from './ui-controller.js';
import { SystemStats } from './system-stats.js';
import { WorkspaceGrid } from './workspace-grid.js';
import { WindowList } from './window-list.js';
class InfiniteDeskApp {
  constructor() {
    this.theme = new ThemeManager();
    this.ui = new UIController();
    this.stats = new SystemStats();
    this.grid = new WorkspaceGrid();
    this.windows = new WindowList();
    this._cleanupStateListener = null;
  }
  async init() {
    console.log('[InfiniteDesk] Initializing renderer...');
    await this.theme.init();
    this.ui.init();
    this.stats.init();
    this.grid.init();
    this.windows.init();
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.theme.toggle();
      });
    }
    this._cleanupStateListener = window.infiniteDesk.onStateUpdate((data) => {
      if (data.workspace) {
        this.grid.render(data.workspace);
      }
      if (data.windows) {
        this.windows.windows = data.windows;
        this.windows.render();
        this.stats.updateWindowCount(data.windows.length);
      }
    });
    this._updateWindowCount();
    this._windowCountInterval = setInterval(() => this._updateWindowCount(), 3000);
    console.log('[InfiniteDesk] Renderer initialized ✓');
  }
  async _updateWindowCount() {
    try {
      const windows = await window.infiniteDesk.getWindows();
      if (windows) {
        this.stats.updateWindowCount(windows.length);
        this.windows.windows = windows;
        this.windows.render();
      }
    } catch (_) {}
  }
  destroy() {
    if (this._cleanupStateListener) {
      this._cleanupStateListener();
    }
    if (this._windowCountInterval) {
      clearInterval(this._windowCountInterval);
    }
    this.theme.destroy();
    this.ui.destroy();
    this.stats.destroy();
    this.grid.destroy();
    this.windows.destroy();
  }
}
const app = new InfiniteDeskApp();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}
window.addEventListener('beforeunload', () => app.destroy());
