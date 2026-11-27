import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = process.cwd();
fs.mkdirSync(path.join(root, "public", "icons"), { recursive: true });
fs.mkdirSync(path.join(root, "public", "sounds"), { recursive: true });

// 1. Generate original 2.2-second Tinoclean notification tone (WAV)
function generateTinocleanTone(filePath) {
  const sampleRate = 44100;
  const duration = 2.2;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // WAV header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // PCM
  buffer.writeUInt16LE(1, 20);  // linear PCM
  buffer.writeUInt16LE(1, 22);  // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // Distinctive fresh water-drop & chime motif:
  // Bubble pop (0.00s) + C5 (0.08s) + E5 (0.24s) + G5 (0.40s) + C6 shimmer (0.58s)
  const notes = [
    { start: 0.08, freq: 523.25, decay: 2.8, amp: 0.28 },
    { start: 0.24, freq: 659.25, decay: 2.6, amp: 0.30 },
    { start: 0.40, freq: 783.99, decay: 2.4, amp: 0.32 },
    { start: 0.58, freq: 1046.5, decay: 1.9, amp: 0.36 },
    { start: 0.58, freq: 1567.98, decay: 2.3, amp: 0.14 },
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // Gentle water-drop chirp at start
    if (t < 0.09) {
      const env = Math.sin((t / 0.09) * Math.PI) * Math.exp(-t * 18);
      const freq = 420 + 680 * (t / 0.09);
      sample += Math.sin(2 * Math.PI * freq * t) * env * 0.28;
    }

    for (const n of notes) {
      if (t >= n.start) {
        const dt = t - n.start;
        const attack = Math.min(1, dt / 0.012);
        const env = attack * Math.exp(-dt * n.decay);
        // Fundamental + gentle 2nd & 3rd bell harmonics
        const wave =
          Math.sin(2 * Math.PI * n.freq * dt) +
          0.22 * Math.sin(2 * Math.PI * n.freq * 2 * dt) * Math.exp(-dt * 4) +
          0.08 * Math.sin(2 * Math.PI * n.freq * 3 * dt) * Math.exp(-dt * 6);
        sample += wave * env * n.amp;
      }
    }

    // Soft master fade-out at end
    if (t > duration - 0.15) {
      sample *= Math.max(0, (duration - t) / 0.15);
    }

    const clamped = Math.max(-0.98, Math.min(0.98, sample));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
}

// 2. Pure-JS PNG generator matching the exact user SVG icon
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }

  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function sdRoundedRect(px, py, w, h, r) {
  const qx = Math.abs(px - w / 2) - (w / 2 - r);
  const qy = Math.abs(py - h / 2) - (h / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax, pay = py - ay;
  const bax = bx - ax, bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  return Math.hypot(pax - bax * h, pay - bay * h);
}

// Point-in-waterdrop approximating M256 86 C256 86 150 206 150 292 a106 106 0 0 0 212 0 C362 206 256 86 256 86 Z
function insideDrop(x, y) {
  if (y < 86 || y > 398) return false;
  if (y >= 292) {
    const dx = x - 256;
    const dy = y - 292;
    return dx * dx + dy * dy <= 106 * 106;
  }
  // Upper cubic Bezier from (256,86) with cp1=(256,86), cp2=(150,206), end=(150,292)
  // For t in [0,1]: y(t) = 86*(1-t)^3 + 3*86*(1-t)^2*t + 3*206*(1-t)*t^2 + 292*t^3
  // Solve t for y using binary search (monotonically increasing)
  let lo = 0, hi = 1;
  for (let k = 0; k < 14; k++) {
    const t = (lo + hi) * 0.5;
    const mt = 1 - t;
    const yt =
      86 * mt * mt * mt +
      3 * 86 * mt * mt * t +
      3 * 206 * mt * t * t +
      292 * t * t * t;
    if (yt < y) lo = t;
    else hi = t;
  }
  const t = (lo + hi) * 0.5;
  const mt = 1 - t;
  const xLeft =
    256 * mt * mt * mt +
    3 * 256 * mt * mt * t +
    3 * 150 * mt * t * t +
    150 * t * t * t;
  const halfWidth = 256 - xLeft;
  return Math.abs(x - 256) <= halfWidth;
}

function renderIcon(size, maskable = false) {
  const rgba = Buffer.alloc(size * size * 4);
  const scale = 512 / size;
  const sub = 2; // 2x2 supersampling for crisp edges

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let rAcc = 0, gAcc = 0, bAcc = 0, aAcc = 0;

      for (let sy = 0; sy < sub; sy++) {
        for (let sx = 0; sx < sub; sx++) {
          const u = (px + (sx + 0.5) / sub) * scale;
          const v = (py + (sy + 0.5) / sub) * scale;

          // Rounded rect clip unless maskable
          let bgAlpha = 1;
          if (!maskable) {
            const d = sdRoundedRect(u, v, 512, 512, 112);
            if (d > 0) bgAlpha = 0;
          }

          if (bgAlpha === 0) continue;

          // Diagonal gradient #264099 -> #02A1DB
          const t = Math.max(0, Math.min(1, (u + v) / 1024));
          let r = 0x26 + (0x02 - 0x26) * t;
          let g = 0x40 + (0xa1 - 0x40) * t;
          let b = 0x99 + (0xdb - 0x99) * t;

          // Transform inner artwork for maskable safe-zone (scale 0.8 centered)
          const gx = maskable ? (u - 51.2) / 0.8 : u;
          const gy = maskable ? (v - 51.2) / 0.8 : v;

          // Water drop
          if (insideDrop(gx, gy)) {
            r = 255;
            g = 255;
            b = 255;

            // Blue 'T' mark: M214 252 h84 M256 252 v96 stroke-width 30 round
            const dTop = sdSegment(gx, gy, 214, 252, 298, 252);
            const dStem = sdSegment(gx, gy, 256, 252, 256, 348);
            if (Math.min(dTop, dStem) <= 15) {
              r = 0x26;
              g = 0x40;
              b = 0x99;
            }
          }

          // Bubbles
          const bubbles = [
            { cx: 368, cy: 128, rad: 16, op: 0.9 },
            { cx: 410, cy: 176, rad: 10, op: 0.75 },
            { cx: 130, cy: 150, rad: 12, op: 0.8 },
          ];
          for (const bub of bubbles) {
            const dist = Math.hypot(gx - bub.cx, gy - bub.cy);
            if (dist <= bub.rad) {
              r = r * (1 - bub.op) + 255 * bub.op;
              g = g * (1 - bub.op) + 255 * bub.op;
              b = b * (1 - bub.op) + 255 * bub.op;
            }
          }

          rAcc += r;
          gAcc += g;
          bAcc += b;
          aAcc += 255;
        }
      }

      const samples = sub * sub;
      const idx = (py * size + px) * 4;
      if (aAcc > 0) {
        const active = aAcc / 255;
        rgba[idx] = Math.round(rAcc / active);
        rgba[idx + 1] = Math.round(gAcc / active);
        rgba[idx + 2] = Math.round(bAcc / active);
        rgba[idx + 3] = Math.round(aAcc / samples);
      }
    }
  }

  return encodePNG(size, size, rgba);
}

generateTinocleanTone(path.join(root, "public", "sounds", "tinoclean-tone.wav"));
fs.writeFileSync(path.join(root, "public", "icons", "icon-192.png"), renderIcon(192, false));
fs.writeFileSync(path.join(root, "public", "icons", "icon-512.png"), renderIcon(512, false));
fs.writeFileSync(path.join(root, "public", "icons", "icon-maskable-512.png"), renderIcon(512, true));
fs.writeFileSync(path.join(root, "public", "icons", "apple-touch-icon.png"), renderIcon(180, true));

console.log("Generated Tinoclean sound and PNG icons successfully.");
