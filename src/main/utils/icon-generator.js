'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { app, nativeImage } = require('electron');
const log = require('./logger');
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[n] = c;
}
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function makePNGChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeB, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeB, data, crc]);
}
function createPNG(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makePNGChunk('IHDR', ihdr);
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowBytes);
  for (let y = 0; y < height; y++) {
    rawData[y * rowBytes] = 0;
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * rowBytes + 1 + x * 4;
      rawData[dstIdx]     = pixels[srcIdx];
      rawData[dstIdx + 1] = pixels[srcIdx + 1];
      rawData[dstIdx + 2] = pixels[srcIdx + 2];
      rawData[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makePNGChunk('IDAT', compressed);
  const iendChunk = makePNGChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}
function renderGradientCircle(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= r + 0.5) {
        const t = Math.min(1, Math.max(0, ((x / size) + (y / size)) / 2));
        const red   = Math.round(59  + t * (139 - 59));
        const green = Math.round(130 + t * (92  - 130));
        const blue  = Math.round(246 + t * (246 - 246));
        const innerGlow = Math.max(0, 1 - dist / r);
        const brightness = 1 + innerGlow * 0.15;
        pixels[idx]     = Math.min(255, Math.round(red * brightness));
        pixels[idx + 1] = Math.min(255, Math.round(green * brightness));
        pixels[idx + 2] = Math.min(255, Math.round(blue * brightness));
        if (dist > r - 0.5) {
          pixels[idx + 3] = Math.round(255 * Math.max(0, Math.min(1, r + 0.5 - dist)));
        } else {
          pixels[idx + 3] = 255;
        }
      } else {
        pixels[idx + 3] = 0;
      }
    }
  }
  return pixels;
}
class IconGenerator {
  constructor() {
    this.cacheDir = null;
  }
  _ensureCacheDir() {
    if (!this.cacheDir) {
      this.cacheDir = path.join(app.getPath('userData'), 'icons');
    }
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }
  generatePNG(size) {
    this._ensureCacheDir();
    const filePath = path.join(this.cacheDir, `icon-${size}.png`);
    if (!fs.existsSync(filePath)) {
      log.info(`[IconGenerator] Creating ${size}x${size} icon at ${filePath}`);
      const pixels = renderGradientCircle(size);
      const png = createPNG(size, size, pixels);
      fs.writeFileSync(filePath, png);
    }
    return filePath;
  }
  getTrayIcon() {
    const iconPath = this.generatePNG(32);
    try {
      return nativeImage.createFromPath(iconPath);
    } catch (err) {
      log.error('[IconGenerator] Failed to create tray icon:', err);
      return nativeImage.createEmpty();
    }
  }
  getWindowIcon() {
    const sizes = [16, 32, 48, 64, 256];
    const images = [];
    for (const size of sizes) {
      const iconPath = this.generatePNG(size);
      try {
        images.push(nativeImage.createFromPath(iconPath));
      } catch (_) {}
    }
    const primaryPath = this.generatePNG(256);
    try {
      return nativeImage.createFromPath(primaryPath);
    } catch (err) {
      log.error('[IconGenerator] Failed to create window icon:', err);
      return images[0] || nativeImage.createEmpty();
    }
  }
}
module.exports = new IconGenerator();
