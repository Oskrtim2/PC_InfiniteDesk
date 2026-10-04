
export class ThemeManager {
  constructor() {
    this.theme = 'light';
    this.root = document.documentElement;
    this._cleanupListener = null;
  }
  async init() {
    try {
      this.theme = await window.infiniteDesk.getTheme();
    } catch (_) {
      this.theme = 'light';
    }
    this._apply();
    this._cleanupListener = window.infiniteDesk.onThemeChanged((theme) => {
      this.theme = theme;
      this._apply();
    });
  }
  toggle() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    this._apply();
    window.infiniteDesk.setTheme(this.theme);
  }
  getTheme() {
    return this.theme;
  }
  isDark() {
    return this.theme === 'dark';
  }
  _apply() {
    this.root.setAttribute('data-theme', this.theme);
  }
  destroy() {
    if (this._cleanupListener) {
      this._cleanupListener();
    }
  }
}
