
export class UIController {
  constructor() {
    this.isExpanded = false;
    this.bubble = document.getElementById('bubble');
    this.panel = document.getElementById('panel');
    this.minimizeBtn = document.getElementById('minimize-btn');
    this.panelHeader = document.getElementById('panel-header');
    this._cleanupToggle = null;
  }
  init() {
    this.bubble.addEventListener('click', (e) => {
      e.stopPropagation();
      this.expand();
    });
    this.minimizeBtn.addEventListener('click', () => {
      this.collapse();
    });
    this._cleanupToggle = window.infiniteDesk.onTogglePanel((expanded) => {
      if (typeof expanded === 'boolean') {
        if (expanded && !this.isExpanded) {
          this._showPanel();
        } else if (!expanded && this.isExpanded) {
          this._hidePanelInstant();
        }
      } else {
        this.toggle();
      }
    });
  }
  toggle() {
    if (this.isExpanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }
  expand() {
    if (this.isExpanded) return;
    this.isExpanded = true;
    window.infiniteDesk.setExpanded(true);
    this._showPanel();
  }
  collapse() {
    if (!this.isExpanded) return;
    this.isExpanded = false;
    this.panel.classList.add('collapsing');
    setTimeout(() => {
      this.panel.classList.add('hidden');
      this.panel.classList.remove('collapsing');
      this.bubble.classList.remove('hidden');
      window.infiniteDesk.setExpanded(false);
    }, 280);
  }
  _showPanel() {
    this.isExpanded = true;
    this.bubble.classList.add('hidden');
    this.panel.classList.remove('hidden', 'collapsing');
    this.panel.offsetHeight;
    this.panel.style.animation = 'none';
    this.panel.offsetHeight;
    this.panel.style.animation = '';
  }
  _hidePanelInstant() {
    this.isExpanded = false;
    this.panel.classList.add('hidden');
    this.panel.classList.remove('collapsing');
    this.bubble.classList.remove('hidden');
  }
  getIsExpanded() {
    return this.isExpanded;
  }
  destroy() {
    if (this._cleanupToggle) {
      this._cleanupToggle();
    }
  }
}
