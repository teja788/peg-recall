// Minimal pure-node PNG decode/encode. 8-bit, non-interlaced.
const fs = require('fs');
const zlib = require('zlib');

const CRC_T = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_T[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function decode(file) {
  const b = fs.readFileSync(file);
  let p = 8, ihdr = null, idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p);
    const type = b.toString('ascii', p + 4, p + 8);
    const data = b.slice(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0), height: data.readUInt32BE(4),
        depth: data[8], colorType: data[9], interlace: data[12],
      };
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (ihdr.depth !== 8 || ihdr.interlace !== 0) throw new Error('unsupported PNG: ' + JSON.stringify(ihdr));
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[ihdr.colorType];
  if (!ch) throw new Error('unsupported colorType ' + ihdr.colorType);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const { width: w, height: h } = ihdr;
  const stride = w * ch;
  const out = Buffer.alloc(stride * h);
  let ptr = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[ptr++];
    const line = raw.slice(ptr, ptr + stride); ptr += stride;
    const cur = out.slice(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.slice((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? cur[i - ch] : 0;
      const bb = prev ? prev[i] : 0;
      const c = prev && i >= ch ? prev[i - ch] : 0;
      let v = line[i];
      if (ft === 1) v += a;
      else if (ft === 2) v += bb;
      else if (ft === 3) v += (a + bb) >> 1;
      else if (ft === 4) {
        const pp = a + bb - c, pa = Math.abs(pp - a), pb = Math.abs(pp - bb), pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? bb : c;
      }
      cur[i] = v & 0xff;
    }
  }
  // normalise to RGBA
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0, n = w * h; i < n; i++) {
    let r, g, bl, al = 255;
    if (ch === 1) { r = g = bl = out[i]; }
    else if (ch === 2) { r = g = bl = out[i * 2]; al = out[i * 2 + 1]; }
    else if (ch === 3) { r = out[i * 3]; g = out[i * 3 + 1]; bl = out[i * 3 + 2]; }
    else { r = out[i * 4]; g = out[i * 4 + 1]; bl = out[i * 4 + 2]; al = out[i * 4 + 3]; }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = bl; rgba[i * 4 + 3] = al;
  }
  return { width: w, height: h, rgba };
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encode(file, { width, height, rgba }, alpha) {
  const ch = alpha ? 4 : 3;
  const stride = width * ch;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4, d = y * (stride + 1) + 1 + x * ch;
      raw[d] = rgba[s]; raw[d + 1] = rgba[s + 1]; raw[d + 2] = rgba[s + 2];
      if (alpha) raw[d + 3] = rgba[s + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = alpha ? 6 : 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]));
}

function flatten(img, hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  for (let i = 0, n = img.width * img.height; i < n; i++) {
    const a = img.rgba[i * 4 + 3] / 255;
    img.rgba[i * 4] = Math.round(img.rgba[i * 4] * a + r * (1 - a));
    img.rgba[i * 4 + 1] = Math.round(img.rgba[i * 4 + 1] * a + g * (1 - a));
    img.rgba[i * 4 + 2] = Math.round(img.rgba[i * 4 + 2] * a + b * (1 - a));
    img.rgba[i * 4 + 3] = 255;
  }
  return img;
}

// box-filter downscale, premultiplied so transparent edges stay clean
function resize(img, w2, h2) {
  const { width: w, height: h, rgba } = img;
  const out = Buffer.alloc(w2 * h2 * 4);
  for (let y = 0; y < h2; y++) {
    const y0 = Math.floor((y * h) / h2), y1 = Math.max(y0 + 1, Math.floor(((y + 1) * h) / h2));
    for (let x = 0; x < w2; x++) {
      const x0 = Math.floor((x * w) / w2), x1 = Math.max(x0 + 1, Math.floor(((x + 1) * w) / w2));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const s = (yy * w + xx) * 4, al = rgba[s + 3] / 255;
        r += rgba[s] * al; g += rgba[s + 1] * al; b += rgba[s + 2] * al; a += rgba[s + 3]; n++;
      }
      const d = (y * w2 + x) * 4, am = a / n / 255;
      out[d] = am ? Math.round(r / n / am) : 0;
      out[d + 1] = am ? Math.round(g / n / am) : 0;
      out[d + 2] = am ? Math.round(b / n / am) : 0;
      out[d + 3] = Math.round(a / n);
    }
  }
  return { width: w2, height: h2, rgba: out };
}

function stats(img) {
  const px = (x, y) => {
    const s = (y * img.width + x) * 4;
    return [img.rgba[s], img.rgba[s + 1], img.rgba[s + 2], img.rgba[s + 3]];
  };
  let minA = 255;
  for (let i = 0, n = img.width * img.height; i < n; i++) minA = Math.min(minA, img.rgba[i * 4 + 3]);
  return { corners: [px(0, 0), px(img.width - 1, 0), px(0, img.height - 1), px(img.width - 1, img.height - 1)], minAlpha: minA };
}

module.exports = { decode, encode, flatten, resize, stats };
