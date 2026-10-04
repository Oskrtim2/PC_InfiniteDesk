
export class WorkspaceGrid {
  constructor() {
    this.gridContainer = document.getElementById('workspace-grid');
    this.zoneLabel = document.getElementById('zone-label');
    this.zoneCoords = document.getElementById('zone-coords');
    this.navButtons = document.querySelectorAll('.nav-btn');
    this.gridData = null;
    this.isNavigating = false;
  }
  init() {
    this.navButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const direction = btn.dataset.direction;
        if (direction && !this.isNavigating) {
          await this.navigate(direction);
        }
      });
    });
    this._fetchAndRender();
    document.addEventListener('keydown', (e) => {
      if (this.isNavigating) return;
      const keyMap = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right',
        'Home': 'home'
      };
      const direction = keyMap[e.key];
      if (direction && (e.ctrlKey || e.altKey)) {
        e.preventDefault();
        this.navigate(direction);
      }
    });
  }
  async _fetchAndRender() {
    try {
      const state = await window.infiniteDesk.getWorkspaceState();
      if (state) {
        this.gridData = state.gridData;
        this.render(state);
      }
    } catch (err) {
      console.error('[WorkspaceGrid] Fetch error:', err);
    }
  }
  render(state) {
    if (!state || !state.gridData) return;
    this.gridData = state.gridData;
    const { grid, current } = state.gridData;
    if (this.zoneLabel) {
      this.zoneLabel.textContent = `Zone: ${current.name} (${current.x}, ${current.y})`;
    }
    if (this.zoneCoords) {
      this.zoneCoords.textContent = `(${current.x}, ${current.y})`;
    }
    this.gridContainer.innerHTML = '';
    let cellIndex = 0;
    for (const row of grid) {
      for (const cell of row) {
        const el = document.createElement('div');
        el.className = 'grid-cell';
        el.style.animationDelay = `${cellIndex * 0.02}s`;
        if (cell.isCurrent) el.classList.add('is-current');
        if (cell.isHome) el.classList.add('is-home');
        if (cell.hasWindows) el.classList.add('has-windows');
        let label = '';
        if (cell.isCurrent) {
          label = '⊕';
        } else if (cell.isHome) {
          label = '⌂';
        } else if (cell.hasWindows) {
          label = cell.windowCount;
        }
        el.innerHTML = `
          <span class="grid-cell-label">${label}</span>
          ${cell.hasWindows && !cell.isCurrent ? `
            <div class="grid-cell-dots">
              ${Array(Math.min(cell.windowCount, 4)).fill('<span class="grid-cell-dot"></span>').join('')}
            </div>
          ` : ''}
        `;
        el.addEventListener('click', () => {
          if (!cell.isCurrent) {
            this.navigateTo(cell.x, cell.y);
          }
        });
        el.title = `${cell.name} (${cell.x}, ${cell.y})${cell.hasWindows ? ` — ${cell.windowCount} window${cell.windowCount > 1 ? 's' : ''}` : ''}`;
        this.gridContainer.appendChild(el);
        cellIndex++;
      }
    }
  }
  async navigate(direction) {
    if (this.isNavigating) return;
    this.isNavigating = true;
    const btn = document.querySelector(`.nav-btn[data-direction="${direction}"]`);
    if (btn) btn.classList.add('active');
    try {
      await window.infiniteDesk.navigate(direction);
      await this._fetchAndRender();
    } catch (err) {
      console.error('[WorkspaceGrid] Navigation error:', err);
    } finally {
      this.isNavigating = false;
      if (btn) btn.classList.remove('active');
    }
  }
  async navigateTo(x, y) {
    if (this.isNavigating) return;
    this.isNavigating = true;
    try {
      await window.infiniteDesk.navigateToZone(x, y);
      await this._fetchAndRender();
    } catch (err) {
      console.error('[WorkspaceGrid] NavigateTo error:', err);
    } finally {
      this.isNavigating = false;
    }
  }
  async refresh() {
    await this._fetchAndRender();
  }
  destroy() {
  }
}
