# ∞ InfiniteDesk

**Infinite Desktop Workspace Manager for Windows 11**

Navigate through unlimited virtual desktop zones. Organize your windows across an infinite 2D workspace grid with a sleek floating interface.

---

## Features

### 🌐 Infinite Workspace Grid
- Unlimited 2D grid of virtual workspace zones
- Navigate in any direction — your desktop never ends
- Assign windows to specific zones for organization
- Windows automatically hide/show when switching zones

### 💫 Floating Bubble Interface
- Small floating bubble stays on screen as a subtle indicator
- Press **Ctrl+E+F** to expand into the full management panel
- Draggable, always-on-top, click-through when minimized
- Smooth morphing animation between states

### 📊 System Dashboard
- Real-time CPU usage with animated gauge
- Real-time RAM usage with animated gauge
- Open window count
- Color-coded alerts (blue → amber → red as load increases)

### 🗺️ Workspace Navigator
- Interactive 5×5 minimap of your workspace zones
- Click any zone to navigate instantly
- Visual indicators for zones with windows
- Direction arrows + Home button for quick navigation

### 🪟 Window Management
- Track all open windows across your system
- Focus, minimize, or move windows between zones
- Grouped display by workspace zone
- Real-time window open/close detection

### 🎨 Theme System
- **Light theme** (primary) — clean, professional, modern
- **Dark theme** — deep navy with glowing accents
- Smooth transition animation between themes
- Persistent preference across sessions

---

## Getting Started

### Prerequisites
- **Windows 11** (or Windows 10)
- **Node.js** 18+ and npm

### Installation

```bash
# Clone or navigate to the project
cd infinitedesk

# Install dependencies
npm install

# Launch in development mode
npm start
```

### Usage

1. **Launch** — The app starts as a floating bubble in the corner of your screen
2. **Toggle** — Press **Ctrl+E+F** (all three keys simultaneously) to expand the panel
3. **Monitor** — View CPU, RAM, and window counts in real-time
4. **Navigate** — Click zones in the minimap or use arrow buttons to switch workspaces
5. **Organize** — New windows are automatically assigned to your current zone
6. **Theme** — Click the sun/moon icon to toggle light/dark theme
7. **Tray** — Right-click the system tray icon for quick options

### Keyboard Shortcuts

| Shortcut | Action |
|:---------|:-------|
| `Ctrl+E+F` | Toggle panel (expand/collapse) |
| `Ctrl+Arrow Keys` | Navigate between zones (when panel is focused) |
| `Ctrl+Home` | Return to home zone (0, 0) |

---

## Architecture

```
src/
├── main/                          # Electron Main Process
│   ├── main.js                    # App entry, window lifecycle
│   ├── tray.js                    # System tray management
│   ├── shortcuts.js               # Ctrl+E+F keyboard detection
│   ├── ipc-handlers.js            # IPC communication hub
│   ├── services/
│   │   ├── system-monitor.js      # CPU/RAM monitoring
│   │   ├── window-tracker.js      # Window enumeration & tracking
│   │   ├── workspace-manager.js   # Infinite grid data model
│   │   └── navigation.js          # Zone switching orchestration
│   └── utils/
│       ├── win32-bridge.js        # PowerShell Win32 API bridge
│       ├── keyboard-monitor.ps1   # Keyboard polling script
│       ├── icon-generator.js      # Runtime PNG icon generator
│       ├── logger.js              # Production logging
│       └── store.js               # JSON persistence
├── renderer/                      # Electron Renderer Process
│   ├── index.html                 # UI shell
│   ├── preload.js                 # Secure IPC bridge
│   ├── styles/
│   │   ├── themes.css             # Light/Dark design tokens
│   │   ├── animations.css         # Keyframe animations
│   │   ├── components.css         # Component styles
│   │   └── main.css               # Global resets & base
│   └── scripts/
│       ├── app.js                 # Main controller
│       ├── ui-controller.js       # Bubble ↔ Panel transitions
│       ├── system-stats.js        # Stat gauge rendering
│       ├── workspace-grid.js      # Minimap grid
│       ├── window-list.js         # Window list rendering
│       └── theme-manager.js       # Theme switching
```

---

## Building for Production

```bash
# Build Windows installer (NSIS)
npm run build
```

Output will be in the `dist/` directory as an NSIS installer.

---

## Technical Details

- **Electron 33** with security best practices (contextIsolation, no nodeIntegration)
- **Win32 API** integration via persistent PowerShell process (P/Invoke)
- **Pure JS icon generation** (no image dependencies)
- **Atomic file writes** for data persistence
- **Auto-restart** for background services on unexpected failures
- **Singleton lock** prevents multiple instances

---

## License

MIT

 
 