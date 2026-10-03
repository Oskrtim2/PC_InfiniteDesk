'use strict';
let log;
try {
  log = require('electron-log');
  log.transports.file.level = 'info';
  log.transports.file.maxSize = 5 * 1024 * 1024;
  log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
  log.transports.console.level = 'debug';
  log.transports.console.format = '{h}:{i}:{s} [{level}] {text}';
} catch (_) {
  log = {
    info:    (...args) => console.log('[INFO]', ...args),
    warn:    (...args) => console.warn('[WARN]', ...args),
    error:   (...args) => console.error('[ERROR]', ...args),
    debug:   (...args) => console.debug('[DEBUG]', ...args),
    verbose: (...args) => console.log('[VERBOSE]', ...args),
  };
}
module.exports = log;
