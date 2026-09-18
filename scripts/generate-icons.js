const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table for PNG chunk generation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createPngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function generatePng(width, height, isMaskable = false) {
  const bytesPerPixel = 4;
  const rowBytes = 1 + width * bytesPerPixel;
  const rawData = Buffer.alloc(rowBytes * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * (isMaskable ? 0.45 : 0.46);
  const bubbleRadius = width * (isMaskable ? 0.28 : 0.30);

  // Colors
  // Green #008069 = rgb(0, 128, 105)
  // Light green #00a884 = rgb(0, 168, 132)
  // White #ffffff = rgb(255, 255, 255)
  // Darker green icon #006050 = rgb(0, 96, 80)

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * bytesPerPixel;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (isMaskable) {
        // Full bleed background for maskable icon safe zone
        let r = 0, g = 128, b = 105, a = 255;
        // Draw speech bubble in center
        const bDist = Math.sqrt(dx * dx + (dy + width * 0.02) * (dy + width * 0.02));
        if (bDist < bubbleRadius) {
          r = 255; g = 255; b = 255;
          // Inner emblem
          const innerDist = Math.sqrt(dx * dx + dy * dy);
          if (innerDist < bubbleRadius * 0.52 && (Math.abs(dx) > bubbleRadius * 0.1 || Math.abs(dy) > bubbleRadius * 0.1)) {
            r = 0; g = 128; b = 105;
          }
        }
        rawData[pxOffset] = r;
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
        rawData[pxOffset + 3] = a;
      } else {
        // Circle rounded icon
        if (dist <= radius) {
          // Antialiasing edge
          let alpha = 255;
          if (dist > radius - 1.5) {
            alpha = Math.floor(255 * (radius - dist) / 1.5);
          }

          let r = 0, g = 128, b = 105; // #008069
          if (dy < 0) {
            // Subtle gradient to #00a884
            const gradFactor = Math.min(1, Math.abs(dy) / radius);
            g = Math.floor(128 + 40 * gradFactor);
            b = Math.floor(105 + 27 * gradFactor);
          }

          // Speech bubble in center
          const bDist = Math.sqrt(dx * dx + (dy + width * 0.02) * (dy + width * 0.02));
          if (bDist < bubbleRadius) {
            r = 255; g = 255; b = 255;
            // Phone handset / chat emblem in middle
            const innerDist = Math.sqrt(dx * dx + dy * dy);
            if (innerDist < bubbleRadius * 0.55 && (Math.abs(dx) > bubbleRadius * 0.12 || Math.abs(dy) > bubbleRadius * 0.12)) {
              r = 0; g = 128; b = 105;
            }
          }

          rawData[pxOffset] = r;
          rawData[pxOffset + 1] = g;
          rawData[pxOffset + 2] = b;
          rawData[pxOffset + 3] = alpha;
        } else {
          // Transparent
          rawData[pxOffset] = 0;
          rawData[pxOffset + 1] = 0;
          rawData[pxOffset + 2] = 0;
          rawData[pxOffset + 3] = 0;
        }
      }
    }
  }

  // Build PNG buffers
  const pngSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression: deflate
  ihdrData[11] = 0; // filter: standard
  ihdrData[12] = 0; // interlace: none
  const ihdrChunk = createPngChunk('IHDR', ihdrData);

  const compressedData = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createPngChunk('IDAT', compressedData);
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSig, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 192x192
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), generatePng(192, 192, false));
console.log('Created icon-192.png');

// 512x512
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), generatePng(512, 512, false));
console.log('Created icon-512.png');

// Maskable 512x512
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), generatePng(512, 512, true));
console.log('Created icon-maskable-512.png');

// Apple Touch Icon 180x180
fs.writeFileSync(path.join(__dirname, '..', 'public', 'apple-touch-icon.png'), generatePng(180, 180, true));
console.log('Created apple-touch-icon.png');
