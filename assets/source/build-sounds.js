/**
 * Peg Recall — sound generator. Pure node, no deps.
 * 44.1 kHz mono 16-bit WAV, peak normalised to -6 dBFS.
 */
const fs = require('fs');
const path = require('path');

const SR = 44100;
const PEAK = Math.pow(10, -6 / 20); // -6 dBFS
const OUT = process.argv[2] || require("os").tmpdir();

const buf = (ms) => new Float64Array(Math.round((ms / 1000) * SR));

/** Soft mallet-ish timbre: sine plus two quiet harmonics. Never harsh. */
function tone(dst, startMs, freq, ms, amp, { attack = 8, tau = null, h2 = 0.18, h3 = 0.05 } = {}) {
  const s0 = Math.round((startMs / 1000) * SR);
  const n = Math.round((ms / 1000) * SR);
  const atk = Math.max(1, Math.round((attack / 1000) * SR));
  const t = tau == null ? ms / 3 : tau;
  for (let i = 0; i < n; i++) {
    const j = s0 + i;
    if (j >= dst.length) break;
    const ts = i / SR;
    // raised-cosine attack, exponential decay
    const env = (i < atk ? 0.5 - 0.5 * Math.cos((Math.PI * i) / atk) : 1) * Math.exp(-ts / (t / 1000));
    const w = 2 * Math.PI * freq * ts;
    dst[j] += amp * env * (Math.sin(w) + h2 * Math.sin(2 * w) + h3 * Math.sin(3 * w));
  }
}

/** Lowpassed noise: the wooden body of a tick. Kept dull so it never hisses. */
function noise(dst, startMs, ms, amp, tauMs, cutoff = 1600) {
  const s0 = Math.round((startMs / 1000) * SR);
  const n = Math.round((ms / 1000) * SR);
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
  let lp = 0;
  let seed = 12345 + s0;
  for (let i = 0; i < n; i++) {
    const j = s0 + i;
    if (j >= dst.length) break;
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const white = (seed / 0x3fffffff) - 1;
    lp += a * (white - lp);
    dst[j] += amp * lp * Math.exp((-i / SR) / (tauMs / 1000));
  }
}

/** One soft peg tick: low body tone + dull noise transient. */
function tick(dst, atMs, freq, amp) {
  tone(dst, atMs, freq, 110, amp, { attack: 1.5, tau: 26, h2: 0.22, h3: 0.08 });
  noise(dst, atMs, 40, amp * 0.5, 7, 1400);
}

const CLIPS = {
  // ~120 ms soft tick — a peg turning over on the board.
  flip() {
    const d = buf(130);
    tick(d, 0, 392, 0.9);
    return d;
  },

  // ~500 ms gentle rattle — dice settling: ticks that slow and quieten.
  roll() {
    const d = buf(520);
    const at = [0, 52, 96, 148, 212, 288, 372];
    const fq = [330, 392, 349, 415, 370, 330, 311];
    at.forEach((t, i) => tick(d, t, fq[i], 0.95 * Math.pow(0.82, i)));
    return d;
  },

  // ~300 ms two-note chime, major third (A4 -> C#5).
  match() {
    const d = buf(320);
    tone(d, 0, 440.0, 300, 0.7, { attack: 6, tau: 130 });
    tone(d, 85, 554.37, 235, 0.62, { attack: 6, tau: 120 });
    return d;
  },

  // ~900 ms ascending three-note (A4 -> C#5 -> E5), major triad.
  win() {
    const d = buf(920);
    tone(d, 0, 440.0, 380, 0.62, { attack: 8, tau: 180 });
    tone(d, 220, 554.37, 420, 0.62, { attack: 8, tau: 190 });
    tone(d, 440, 659.26, 480, 0.68, { attack: 8, tau: 260 });
    // quiet octave beneath the last note so the ending feels settled
    tone(d, 440, 329.63, 470, 0.22, { attack: 12, tau: 240, h2: 0.1, h3: 0 });
    return d;
  },
};

function wav(samples) {
  // normalise to -6 dBFS and fade the last 8 ms so the file never clicks shut
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  const g = peak > 0 ? PEAK / peak : 0;
  const fade = Math.round(0.008 * SR);
  const n = samples.length;
  const pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    let v = samples[i] * g;
    if (i > n - fade) v *= (n - i) / fade;
    const s = Math.max(-1, Math.min(1, v));
    pcm.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

for (const [name, make] of Object.entries(CLIPS)) {
  const s = make();
  fs.writeFileSync(path.join(OUT, name + '.wav'), wav(s));
  console.log(name, ((s.length / SR) * 1000).toFixed(0) + 'ms');
}
