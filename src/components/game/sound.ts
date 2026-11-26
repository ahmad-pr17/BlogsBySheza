// Sound effects, made in the browser with the Web Audio API (no audio files).
// Everything is quiet and short; there is a mute switch that is remembered.

export type SoundName =
  | "step"
  | "stepWood"
  | "click"
  | "pop"
  | "chat"
  | "door"
  | "sizzle"
  | "chime"
  | "bird"
  | "tap"
  | "good"
  | "bad"
  | "splash"
  | "page"
  | "fanfare"
  | "cricket"
  | "wing";

const KEY = "trail-sound";

type Listener = () => void;

function createSound() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let muted = false;
  const listeners = new Set<Listener>();

  if (typeof window !== "undefined") {
    try {
      muted = localStorage.getItem(KEY) === "off";
    } catch {
      /* ignore */
    }
  }

  // Must be called from a click or key press the first time (browser rule).
  function ensure() {
    if (typeof window === "undefined") return null;
    if (!ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.35;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }

  // The audio context only exists after unlock() (a click), never before.
  function live() {
    if (!ctx) return null;
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }

  function tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    slideTo?: number,
    delay = 0,
  ) {
    const c = live();
    if (!c || !master || muted) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function noise(dur: number, vol: number, filter: BiquadFilterType, cutoff: number) {
    const c = live();
    if (!c || !master || muted) return;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = filter;
    f.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(master);
    src.start();
  }

  function play(name: SoundName) {
    if (muted) return;
    switch (name) {
      case "step":
        noise(0.07, 0.22, "lowpass", 500 + Math.random() * 250);
        break;
      case "stepWood":
        tone(150 + Math.random() * 30, 0.06, "triangle", 0.12);
        noise(0.05, 0.1, "lowpass", 1100);
        break;
      case "click":
        tone(820, 0.05, "square", 0.05, 620);
        break;
      case "pop":
        tone(520, 0.1, "sine", 0.14, 900);
        break;
      case "chat":
        tone(660, 0.08, "sine", 0.1);
        tone(880, 0.1, "sine", 0.1, undefined, 0.09);
        break;
      case "door":
        noise(0.22, 0.2, "lowpass", 380);
        tone(120, 0.2, "sawtooth", 0.06, 70);
        break;
      case "sizzle":
        noise(0.7, 0.1, "highpass", 3200);
        break;
      case "chime":
        [523, 659, 784].forEach((f, i) => tone(f, 0.3, "sine", 0.1, undefined, i * 0.12));
        break;
      case "tap":
        tone(540 + Math.random() * 120, 0.05, "square", 0.05, 420);
        break;
      case "good":
        tone(660, 0.1, "sine", 0.1);
        tone(990, 0.14, "sine", 0.1, undefined, 0.08);
        break;
      case "bad":
        tone(200, 0.18, "sawtooth", 0.07, 120);
        break;
      case "splash":
        noise(0.35, 0.18, "bandpass", 1400);
        tone(300, 0.15, "sine", 0.06, 120);
        break;
      case "page":
        noise(0.09, 0.12, "highpass", 2500);
        break;
      case "fanfare":
        [392, 392, 523, 659, 784].forEach((f, i) => tone(f, i === 4 ? 0.5 : 0.16, "square", 0.05, undefined, i * 0.15));
        break;
      case "wing":
        noise(0.06, 0.05, "highpass", 3800);
        break;
      case "cricket": {
        const base = 3600 + Math.random() * 500;
        for (let i = 0; i < 3; i++) tone(base, 0.035, "square", 0.012, undefined, i * 0.07);
        break;
      }
      case "bird": {
        const base = 2200 + Math.random() * 900;
        tone(base, 0.08, "sine", 0.04, base * 1.4);
        tone(base * 1.3, 0.07, "sine", 0.035, base, 0.1);
        if (Math.random() < 0.5) tone(base * 1.2, 0.07, "sine", 0.03, base * 1.5, 0.2);
        break;
      }
    }
  }

  // ---- lo-fi study music: an endless loop made of a few soft chords, a mellow
  // beat and a little vinyl crackle. Nothing to download.
  let lofiOut: GainNode | null = null;
  let lofiTimer: ReturnType<typeof setInterval> | null = null;
  let lofiCrackle: AudioBufferSourceNode | null = null;
  let lofiNext = 0;
  let lofiBar = 0;
  const BEAT = 0.68;
  // Cmaj7, Am7, Fmaj7, G7 (bass note, chord notes)
  const LOFI_BARS: [number, number[]][] = [
    [65.4, [261.6, 329.6, 392, 493.9]],
    [55, [261.6, 329.6, 392, 440]],
    [87.3, [261.6, 329.6, 440, 523.3]],
    [49, [246.9, 293.7, 349.2, 392]],
  ];
  const LOFI_MELODY = [659, 0, 587, 523, 0, 392, 440, 0, 523, 0, 494, 440, 392, 0, 0, 0];

  function lofiVoice(f: number, t0: number, dur: number, type: OscillatorType, vol: number, attack = 0.02) {
    const c = ctx;
    if (!c || !lofiOut) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = (Math.random() - 0.5) * 14; // a little wobble, like old tape
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(lofiOut);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  function lofiNoise(t0: number, dur: number, vol: number, type: BiquadFilterType, cutoff: number) {
    const c = ctx;
    if (!c || !lofiOut) return;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(lofiOut);
    src.start(t0);
  }

  function lofiScheduleBar(t0: number, bar: number) {
    const [bass, chord] = LOFI_BARS[bar % LOFI_BARS.length];
    // chord pad, slightly lagging like a loose player
    chord.forEach((f, i) => {
      lofiVoice(f, t0 + i * 0.018, BEAT * 3.6, "triangle", 0.05, 0.12);
      lofiVoice(f * 2, t0 + i * 0.018, BEAT * 2.2, "sine", 0.018, 0.1);
    });
    lofiVoice(bass, t0, BEAT * 1.8, "sine", 0.17, 0.03);
    lofiVoice(bass, t0 + BEAT * 2.5, BEAT * 1.2, "sine", 0.12, 0.03);
    for (let b = 0; b < 4; b++) {
      const t = t0 + b * BEAT;
      if (b === 0 || b === 2) {
        // kick
        const c = ctx!;
        const o = c.createOscillator();
        const g = c.createGain();
        o.frequency.setValueAtTime(130, t);
        o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        o.connect(g).connect(lofiOut!);
        o.start(t);
        o.stop(t + 0.22);
      } else lofiNoise(t, 0.16, 0.11, "bandpass", 1800); // snare
      lofiNoise(t + BEAT * 0.5 + 0.03, 0.04, 0.035, "highpass", 7000); // swung hat
    }
    // a lazy little tune over the top
    for (let i = 0; i < 4; i++) {
      const f = LOFI_MELODY[(bar * 4 + i) % LOFI_MELODY.length];
      if (f) lofiVoice(f, t0 + i * BEAT + 0.04, BEAT * 1.1, "sine", 0.05, 0.015);
    }
  }

  function lofiPump() {
    const c = ctx;
    if (!c || !lofiOut) return;
    if (lofiNext < c.currentTime + 0.1) lofiNext = c.currentTime + 0.1;
    while (lofiNext < c.currentTime + 1.6) {
      lofiScheduleBar(lofiNext, lofiBar++);
      lofiNext += BEAT * 4;
    }
  }

  function lofiStart() {
    const c = ensure();
    if (!c || !master || lofiTimer) return;
    const lp = c.createBiquadFilter(); // the muffled lo-fi sound
    lp.type = "lowpass";
    lp.frequency.value = 2600;
    const out = c.createGain();
    out.gain.value = 0.9;
    out.connect(lp).connect(master);
    lofiOut = out;
    // vinyl crackle: a loop of faint random pops
    const len = c.sampleRate * 3;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() < 0.0009 ? (Math.random() * 2 - 1) * 0.9 : (Math.random() * 2 - 1) * 0.02;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = c.createGain();
    g.gain.value = 0.35;
    src.connect(g).connect(out);
    src.start();
    lofiCrackle = src;
    lofiNext = 0;
    lofiBar = 0;
    lofiPump();
    lofiTimer = setInterval(lofiPump, 400);
    listeners.forEach((l) => l());
  }

  function lofiStop() {
    if (lofiTimer) clearInterval(lofiTimer);
    lofiTimer = null;
    try {
      lofiCrackle?.stop();
    } catch {
      /* already stopped */
    }
    lofiCrackle = null;
    if (lofiOut && ctx) {
      // fade out whatever is already scheduled
      lofiOut.gain.cancelScheduledValues(ctx.currentTime);
      lofiOut.gain.setValueAtTime(lofiOut.gain.value, ctx.currentTime);
      lofiOut.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    }
    lofiOut = null;
    listeners.forEach((l) => l());
  }

  return {
    play,
    lofiStart,
    lofiStop,
    lofiOn: () => lofiTimer !== null,
    // a little waltz (3/4) for the ballroom: bass and two chords under a tune
    waltz(totalBars = 8) {
      if (muted) return;
      const BAR = 0.62;
      // chords as [bass, [chord notes]] over 8 bars: C F G C / Am F G C
      const bars: [number, number[]][] = [
        [131, [330, 392, 523]],
        [175, [349, 440, 523]],
        [196, [392, 494, 587]],
        [131, [330, 392, 523]],
        [220, [330, 440, 523]],
        [175, [349, 440, 523]],
        [196, [392, 494, 587]],
        [131, [330, 392, 523]],
      ];
      const tune = [659, 587, 523, 587, 659, 784, 698, 659, 587, 523, 587, 494, 523, 587, 659, 523];
      for (let i = 0; i < totalBars; i++) {
        const [bass, chord] = bars[i % bars.length];
        const t0 = i * BAR;
        tone(bass, 0.4, "triangle", 0.13, undefined, t0);
        chord.forEach((f) => {
          tone(f, 0.16, "sine", 0.045, undefined, t0 + BAR / 3);
          tone(f, 0.16, "sine", 0.045, undefined, t0 + (2 * BAR) / 3);
        });
        [0, 1].forEach((k) => {
          const f = tune[(i * 2 + k) % tune.length];
          tone(f, 0.28, "triangle", 0.1, undefined, t0 + (k * BAR) / 2);
        });
      }
    },
    // a soft piano-ish note for the living-room piano
    note(freq: number) {
      if (muted) return;
      tone(freq, 0.9, "triangle", 0.16);
      tone(freq * 2, 0.5, "sine", 0.05);
    },
    unlock() {
      ensure();
    },
    isMuted: () => muted,
    setMuted(next: boolean) {
      muted = next;
      try {
        localStorage.setItem(KEY, next ? "off" : "on");
      } catch {
        /* ignore */
      }
      if (master) master.gain.value = next ? 0 : 0.35;
      if (!next) ensure();
      listeners.forEach((l) => l());
    },
    subscribe(l: Listener) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}

export const sound = createSound();
