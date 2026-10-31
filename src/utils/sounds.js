/**
 * Sonidos de la app, generados con Web Audio en el navegador: no hay archivos de
 * audio que licenciar, descargar ni cachear.
 *
 * - `playNotification()`: el "ding-ding" corto de mensajería para avisos nuevos
 *   (respuesta de soporte, notificación, respuesta de formulario).
 * - `tourMusic`: fondo ambiental suave mientras corre un tutorial.
 *
 * El navegador no deja sonar nada hasta que el usuario interactúa con la página;
 * `installAudioUnlock()` reactiva el contexto en el primer clic o tecla. Cada
 * sonido se puede apagar por separado y la preferencia vive en este navegador.
 */

const PREF_KEYS = { notifications: "ot_sound_notifications", tourMusic: "ot_sound_tour_music" };
const listeners = new Set();

export function soundEnabled(kind) {
  try { return localStorage.getItem(PREF_KEYS[kind]) !== "off"; } catch { return true; }
}

export function setSoundEnabled(kind, enabled) {
  try { localStorage.setItem(PREF_KEYS[kind], enabled ? "on" : "off"); } catch { /* sin almacenamiento: queda solo en esta sesión */ }
  listeners.forEach((fn) => fn(kind, enabled));
}

export function onSoundPrefChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let ctx = null;
function audio() {
  if (ctx) return ctx;
  // Un navegador manejado por pruebas automáticas (Playwright, Selenium) nunca
  // suena: las e2e abren el tutorial de bienvenida y WebKit no viene silenciado,
  // así que la música salía por las bocinas de quien corría la suite.
  if (typeof navigator !== "undefined" && navigator.webdriver) return null;
  const Ctx = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  if (!Ctx) return null;
  try { ctx = new Ctx(); } catch { ctx = null; }
  return ctx;
}

export function installAudioUnlock() {
  if (typeof window === "undefined") return () => {};
  const unlock = () => { const c = audio(); if (c?.state === "suspended") c.resume().catch(() => {}); };
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
  return () => { window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
}

function tone(c, { freq, at, length, gain, type = "sine", out }) {
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(env).connect(out);
  osc.start(at);
  osc.stop(at + length + 0.05);
}

// Evita que tres avisos que llegan juntos suenen como una ráfaga.
let lastNotification = 0;

export function playNotification() {
  if (!soundEnabled("notifications")) return;
  const c = audio();
  if (!c || c.state !== "running") return;
  const now = c.currentTime;
  if (now - lastNotification < 1.5) return;
  lastNotification = now;
  const out = c.createGain();
  out.gain.value = 0.22;
  out.connect(c.destination);
  // Dos notas ascendentes (Sol6 → Do7) con un armónico suave: se oye como un
  // aviso de mensajería, no como una alarma.
  [[1568, 0], [2093, 0.13]].forEach(([freq, delay]) => {
    tone(c, { freq, at: now + delay, length: 0.45, gain: 0.9, out });
    tone(c, { freq: freq * 2, at: now + delay, length: 0.18, gain: 0.12, out });
  });
}

// Acordes lentos (Do maj7 → La m7 → Fa maj7 → Sol 6) y notas sueltas de la
// escala pentatónica encima, con un eco largo: relajante sin volverse melodía
// que distraiga de lo que explica el tutorial.
const CHORDS = [[130.81, 196, 246.94, 329.63], [110, 164.81, 196, 261.63], [87.31, 130.81, 174.61, 220], [98, 146.83, 196, 246.94]];
const BELLS = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
const CHORD_SECONDS = 8;

function createTourMusic() {
  let master = null;
  let timers = [];
  let chordIndex = 0;

  const pad = (c, out, freqs, at) => {
    freqs.forEach((freq, i) => {
      const osc = c.createOscillator();
      const env = c.createGain();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;
      osc.detune.value = (i % 2 ? 1 : -1) * 4;
      env.gain.setValueAtTime(0.0001, at);
      env.gain.linearRampToValueAtTime(0.16, at + 2.5);
      env.gain.linearRampToValueAtTime(0.0001, at + CHORD_SECONDS + 2);
      osc.connect(env).connect(out);
      osc.start(at);
      osc.stop(at + CHORD_SECONDS + 2.2);
    });
  };

  const loop = (c, padOut, bellOut) => {
    pad(c, padOut, CHORDS[chordIndex % CHORDS.length], c.currentTime + 0.05);
    chordIndex += 1;
    [1.2, 3.4, 5.6].forEach((offset) => {
      if (Math.random() < 0.7) {
        const freq = BELLS[Math.floor(Math.random() * BELLS.length)];
        tone(c, { freq, at: c.currentTime + offset + Math.random() * 0.6, length: 2.4, gain: 0.35, out: bellOut });
      }
    });
    timers.push(setTimeout(() => loop(c, padOut, bellOut), CHORD_SECONDS * 1000));
  };

  return {
    get playing() { return Boolean(master); },
    start() {
      if (master || !soundEnabled("tourMusic")) return;
      const c = audio();
      if (!c) return;
      if (c.state === "suspended") c.resume().catch(() => {});
      master = c.createGain();
      master.gain.setValueAtTime(0.0001, c.currentTime);
      master.gain.linearRampToValueAtTime(0.09, c.currentTime + 2);
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1400;
      filter.connect(master).connect(c.destination);
      const padOut = c.createGain();
      padOut.gain.value = 0.5;
      padOut.connect(filter);
      const bellOut = c.createGain();
      bellOut.gain.value = 0.25;
      const delay = c.createDelay(2);
      delay.delayTime.value = 0.42;
      const feedback = c.createGain();
      feedback.gain.value = 0.38;
      bellOut.connect(filter);
      bellOut.connect(delay);
      delay.connect(feedback).connect(delay);
      delay.connect(filter);
      chordIndex = 0;
      loop(c, padOut, bellOut);
    },
    stop() {
      timers.forEach(clearTimeout);
      timers = [];
      if (!master) return;
      const c = audio();
      const fading = master;
      master = null;
      if (!c) return;
      fading.gain.cancelScheduledValues(c.currentTime);
      fading.gain.setValueAtTime(fading.gain.value, c.currentTime);
      fading.gain.linearRampToValueAtTime(0.0001, c.currentTime + 1.2);
      setTimeout(() => fading.disconnect(), 1400);
    },
  };
}

export const tourMusic = createTourMusic();
