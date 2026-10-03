'use strict';
const { spawn } = require('child_process');
const log = require('./logger');
class Win32Bridge {
  constructor() {
    this.process = null;
    this.pendingCallbacks = [];
    this.buffer = '';
    this.initialized = false;
    this.initPromise = null;
    this.destroyed = false;
  }
  async init() {
    if (this.initPromise) return this.initPromise;
    this.initPromise = new Promise((resolve, reject) => {
      try {
        this.process = spawn('powershell.exe', [
          '-NoProfile', '-NoLogo', '-NonInteractive',
          '-ExecutionPolicy', 'Bypass',
          '-Command', '-'
        ], {
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true
        });
        this.process.stdout.on('data', (data) => {
          this.buffer += data.toString();
          this._processBuffer();
        });
        this.process.stderr.on('data', (data) => {
          const msg = data.toString().trim();
          if (msg) log.warn('[Win32Bridge] stderr:', msg);
        });
        this.process.on('error', (err) => {
          log.error('[Win32Bridge] Process error:', err.message);
        });
        this.process.on('exit', (code) => {
          log.info('[Win32Bridge] Process exited, code:', code);
          this.initialized = false;
          this.initPromise = null;
          if (!this.destroyed) {
            setTimeout(() => this._restart(), 3000);
          }
        });
        const initScript = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win32API {
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")]
    public static extern int GetWindowTextLength(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool IsZoomed(IntPtr hWnd);
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
    public const int SW_HIDE = 0;
    public const int SW_SHOWNORMAL = 1;
    public const int SW_SHOW = 5;
    public const int SW_MINIMIZE = 6;
    public const int SW_RESTORE = 9;
}
"@
Write-Output "___BRIDGE_READY___"
`;
        this.process.stdin.write(initScript + '\n');
        const checkReady = setInterval(() => {
          if (this.buffer.includes('___BRIDGE_READY___')) {
            clearInterval(checkReady);
            clearTimeout(timeout);
            this.buffer = this.buffer.replace('___BRIDGE_READY___', '').trim();
            this.initialized = true;
            log.info('[Win32Bridge] Initialized successfully');
            resolve();
          }
        }, 100);
        const timeout = setTimeout(() => {
          clearInterval(checkReady);
          if (!this.initialized) {
            log.error('[Win32Bridge] Initialization timed out');
            reject(new Error('Win32Bridge init timed out'));
          }
        }, 15000);
      } catch (err) {
        log.error('[Win32Bridge] Init failed:', err.message);
        reject(err);
      }
    });
    return this.initPromise;
  }
  async _restart() {
    if (this.destroyed) return;
    log.info('[Win32Bridge] Restarting...');
    this.initialized = false;
    this.initPromise = null;
    this.buffer = '';
    this.pendingCallbacks.forEach(cb => cb.resolve(''));
    this.pendingCallbacks = [];
    try {
      await this.init();
    } catch (err) {
      log.error('[Win32Bridge] Restart failed:', err.message);
    }
  }
  destroy() {
    this.destroyed = true;
    this.pendingCallbacks.forEach(cb => cb.resolve(''));
    this.pendingCallbacks = [];
    if (this.process) {
      try {
        this.process.stdin.end();
        this.process.kill();
      } catch (_) {}
      this.process = null;
    }
  }
  _processBuffer() {
    while (this.pendingCallbacks.length > 0) {
      const { marker, resolve } = this.pendingCallbacks[0];
      const markerIdx = this.buffer.indexOf(marker);
      if (markerIdx === -1) break;
      const output = this.buffer.substring(0, markerIdx).trim();
      this.buffer = this.buffer.substring(markerIdx + marker.length).trimStart();
      this.pendingCallbacks.shift();
      resolve(output);
    }
  }
  async execute(script) {
    if (!this.initialized) {
      try {
        await this.init();
      } catch (err) {
        log.error('[Win32Bridge] Cannot execute — not initialized');
        return '';
      }
    }
    return new Promise((resolve) => {
      const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
      const marker = `___END_${id}___`;
      this.pendingCallbacks.push({ marker, resolve });
      try {
        this.process.stdin.write(`${script}\nWrite-Output "${marker}"\n`);
      } catch (err) {
        log.error('[Win32Bridge] Write error:', err.message);
        const idx = this.pendingCallbacks.findIndex(cb => cb.marker === marker);
        if (idx !== -1) this.pendingCallbacks.splice(idx, 1);
        resolve('');
      }
      setTimeout(() => {
        const idx = this.pendingCallbacks.findIndex(cb => cb.marker === marker);
        if (idx !== -1) {
          this.pendingCallbacks.splice(idx, 1);
          resolve('');
        }
      }, 8000);
    });
  }
  async getOpenWindows() {
    const script = `
$results = @()
$procs = Get-Process | Where-Object {
    $_.MainWindowHandle -ne [IntPtr]::Zero -and
    $_.MainWindowTitle -ne '' -and
    $_.ProcessName -notin @('TextInputHost','SystemSettings','ShellExperienceHost','SearchHost','StartMenuExperienceHost','LockApp')
}
foreach ($p in $procs) {
    try {
        $hwnd = $p.MainWindowHandle
        $visible = [Win32API]::IsWindowVisible($hwnd)
        if ($visible) {
            $rect = New-Object Win32API+RECT
            [void][Win32API]::GetWindowRect($hwnd, [ref]$rect)
            $minimized = [Win32API]::IsIconic($hwnd)
            $maximized = [Win32API]::IsZoomed($hwnd)
            $results += [PSCustomObject]@{
                pid       = $p.Id
                name      = $p.ProcessName
                title     = $p.MainWindowTitle
                hwnd      = $hwnd.ToInt64()
                x         = $rect.Left
                y         = $rect.Top
                width     = [Math]::Max(0, $rect.Right - $rect.Left)
                height    = [Math]::Max(0, $rect.Bottom - $rect.Top)
                minimized = [bool]$minimized
                maximized = [bool]$maximized
            }
        }
    } catch {}
}
if ($results.Count -eq 0) { Write-Output "[]" }
elseif ($results.Count -eq 1) { Write-Output ("[" + ($results | ConvertTo-Json -Compress) + "]") }
else { Write-Output ($results | ConvertTo-Json -Compress) }
`;
    try {
      const result = await this.execute(script);
      if (!result || result === '' || result === '[]') return [];
      const parsed = JSON.parse(result);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (err) {
      log.error('[Win32Bridge] getOpenWindows parse error:', err.message);
      return [];
    }
  }
  async moveWindow(hwnd, x, y, width, height) {
    const script = `[Win32API]::MoveWindow([IntPtr]${hwnd}, ${x}, ${y}, ${width}, ${height}, $true) | Out-Null`;
    await this.execute(script);
  }
  async hideWindow(hwnd) {
    const script = `[Win32API]::ShowWindow([IntPtr]${hwnd}, [Win32API]::SW_HIDE) | Out-Null`;
    await this.execute(script);
  }
  async showWindow(hwnd) {
    const script = `[Win32API]::ShowWindow([IntPtr]${hwnd}, [Win32API]::SW_SHOW) | Out-Null`;
    await this.execute(script);
  }
  async minimizeWindow(hwnd) {
    const script = `[Win32API]::ShowWindow([IntPtr]${hwnd}, [Win32API]::SW_MINIMIZE) | Out-Null`;
    await this.execute(script);
  }
  async restoreWindow(hwnd) {
    const script = `[Win32API]::ShowWindow([IntPtr]${hwnd}, [Win32API]::SW_RESTORE) | Out-Null`;
    await this.execute(script);
  }
  async focusWindow(hwnd) {
    const script = `
[Win32API]::ShowWindow([IntPtr]${hwnd}, [Win32API]::SW_RESTORE) | Out-Null
[Win32API]::SetForegroundWindow([IntPtr]${hwnd}) | Out-Null
`;
    await this.execute(script);
  }
  async getForegroundWindow() {
    const script = `[Win32API]::GetForegroundWindow().ToInt64()`;
    const result = await this.execute(script);
    return parseInt(result, 10) || 0;
  }
}
module.exports = new Win32Bridge();
