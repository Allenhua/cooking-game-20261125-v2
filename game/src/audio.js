// Synthesised sound only: every effect is a small WebAudio oscillator/envelope,
// and the background music is a light looped bass-and-pluck pattern. No audio
// files, no network, and everything starts after the first user gesture.
const NOTE = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25, E5: 659.25, G5: 783.99 };

export function createAudio() {
  let context = null;
  let musicTimer = null;
  let muted = false;
  let step = 0;

  function ensure() {
    if (context) return context;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      context = new AC();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, seconds, type, volume, when = 0, slideTo = null) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + seconds);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  function noise(seconds, volume, when = 0, lowpass = 1200) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t0);
  }

  const sfx = {
    grab() { tone(520, 0.07, 'triangle', 0.12); },
    chop() { noise(0.09, 0.25, 0, 2500); tone(180, 0.06, 'square', 0.06); },
    sizzle() { noise(0.35, 0.10, 0, 5000); },
    ding() { tone(NOTE.E5, 0.18, 'sine', 0.18); tone(NOTE.G5, 0.25, 'sine', 0.15, 0.09); },
    serve() {
      tone(NOTE.C5, 0.12, 'triangle', 0.16);
      tone(NOTE.E5, 0.12, 'triangle', 0.16, 0.09);
      tone(NOTE.G5, 0.22, 'triangle', 0.18, 0.18);
    },
    combo(combo) {
      const base = NOTE.C5 * Math.pow(1.059, Math.min(combo, 8));
      tone(base, 0.12, 'square', 0.08);
      tone(base * 1.5, 0.2, 'square', 0.08, 0.08);
    },
    wrong() { tone(220, 0.18, 'sawtooth', 0.12, 0, 110); },
    expire() { tone(330, 0.3, 'sawtooth', 0.1, 0, 130); tone(165, 0.3, 'sawtooth', 0.08, 0.12, 90); },
    tick() { tone(880, 0.05, 'square', 0.05); },
    trash() { noise(0.15, 0.2, 0, 900); },
    start() {
      tone(NOTE.C4, 0.12, 'triangle', 0.15);
      tone(NOTE.E4, 0.12, 'triangle', 0.15, 0.1);
      tone(NOTE.G4, 0.12, 'triangle', 0.15, 0.2);
      tone(NOTE.C5, 0.28, 'triangle', 0.18, 0.3);
    },
    over() {
      tone(NOTE.G4, 0.25, 'triangle', 0.14);
      tone(NOTE.E4, 0.25, 'triangle', 0.14, 0.22);
      tone(NOTE.C4, 0.5, 'triangle', 0.14, 0.44);
    },
  };

  // A cheerful two-bar loop: soft bass roots with a plucked melody on top.
  const BASS = [NOTE.C4, NOTE.F4, NOTE.G4, NOTE.F4];
  const MELODY = [NOTE.E5, NOTE.G5, NOTE.E5, NOTE.C5, NOTE.D4, NOTE.F4, NOTE.G4, NOTE.E4];
  function startMusic() {
    ensure();
    if (!context || musicTimer !== null) return;
    musicTimer = window.setInterval(() => {
      if (muted || !context) return;
      const bar = step % 4;
      tone(BASS[bar], 0.45, 'sine', 0.07);
      const m = MELODY[step % MELODY.length];
      tone(m, 0.22, 'triangle', 0.05);
      step += 1;
    }, 300);
  }
  function stopMusic() {
    if (musicTimer !== null) { window.clearInterval(musicTimer); musicTimer = null; }
  }
  function toggleMute() {
    muted = !muted;
    return muted;
  }

  return { ensure, sfx, startMusic, stopMusic, toggleMute, isMuted: () => muted };
}
