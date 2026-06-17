"use client";

// Web Audio API synthesized sound effects — no external files needed.
// All functions are no-ops in SSR context (AudioContext not available).

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  startTime: number,
  duration: number,
  gainPeak: number,
  type: OscillatorType = "sine",
  ac: AudioContext = getCtx()!
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function noise(startTime: number, duration: number, gainPeak: number, ac: AudioContext) {
  const buf = ac.createBuffer(1, ac.sampleRate * duration, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const gain = ac.createGain();
  src.connect(gain);
  gain.connect(ac.destination);
  gain.gain.setValueAtTime(gainPeak, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  src.start(startTime);
  src.stop(startTime + duration + 0.05);
}

// Short ascending chime after EXP gain
export function playExpGain() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(880, t, 0.18, 0.2, "sine", ac);
  tone(1047, t + 0.1, 0.18, 0.15, "sine", ac);
  tone(1319, t + 0.2, 0.25, 0.12, "sine", ac);
}

// Low rumble that rises during roulette spin
export function playRouletteSpin() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // Rising white noise burst
  noise(t, 0.6, 0.08, ac);
  // Wobbling tone
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(60, t);
  osc.frequency.linearRampToValueAtTime(220, t + 2.5);
  gain.gain.setValueAtTime(0.07, t);
  gain.gain.linearRampToValueAtTime(0.12, t + 2.0);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 3.0);
  osc.start(t);
  osc.stop(t + 3.1);
}

// Reveal sound scaled by rarity
export function playRarityReveal(rarity: "COMMON" | "UNCOMMON" | "RARE" | "LEGENDARY") {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;

  if (rarity === "COMMON") {
    tone(660, t, 0.3, 0.15, "sine", ac);
  } else if (rarity === "UNCOMMON") {
    tone(660, t, 0.2, 0.15, "triangle", ac);
    tone(880, t + 0.15, 0.3, 0.15, "sine", ac);
  } else if (rarity === "RARE") {
    tone(528, t, 0.15, 0.15, "triangle", ac);
    tone(660, t + 0.1, 0.15, 0.15, "triangle", ac);
    tone(880, t + 0.2, 0.15, 0.15, "sine", ac);
    tone(1047, t + 0.3, 0.4, 0.2, "sine", ac);
    noise(t, 0.3, 0.05, ac);
  } else {
    // LEGENDARY — 5-note fanfare + noise
    const fanfare = [523, 659, 784, 1047, 1319];
    fanfare.forEach((f, i) => tone(f, t + i * 0.1, 0.4, 0.18, "sine", ac));
    tone(1319, t + 0.55, 0.8, 0.25, "sine", ac);
    noise(t, 0.5, 0.1, ac);
    // Low rumble
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.connect(g);
    g.connect(ac.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(55, t);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    osc.start(t);
    osc.stop(t + 0.85);
  }
}

// Dramatic ascending sweep for evolution
export function playEvolution() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // Chromatic sweep
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(110, t);
  osc.frequency.exponentialRampToValueAtTime(1760, t + 1.2);
  gain.gain.setValueAtTime(0.18, t);
  gain.gain.linearRampToValueAtTime(0.22, t + 0.8);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
  osc.start(t);
  osc.stop(t + 1.6);
  noise(t + 0.2, 1.0, 0.06, ac);
  // Final sting
  const notes = [784, 1047, 1319, 1568];
  notes.forEach((f, i) => tone(f, t + 1.0 + i * 0.08, 0.5, 0.15, "sine", ac));
}

// Called after evolution "after" phase appears
export function playEvolutionFanfare() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  [523, 659, 784, 880, 1047, 1319].forEach((f, i) =>
    tone(f, t + i * 0.09, 0.5, 0.18, "sine", ac)
  );
}

// Confirmation ding for NMD claim
export function playNmdClaim() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(880, t, 0.12, 0.18, "sine", ac);
  tone(1047, t + 0.1, 0.12, 0.15, "sine", ac);
  tone(1319, t + 0.2, 0.2, 0.12, "sine", ac);
  tone(1760, t + 0.32, 0.4, 0.15, "sine", ac);
}

// Short click for outfit apply
export function playEquip() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(1047, t, 0.12, 0.12, "sine", ac);
  tone(1319, t + 0.08, 0.2, 0.1, "sine", ac);
}

// Tiny click as the pulse-dial / keypad ticks. freq rises slightly with the value
// so spinning the dial up sounds like a winding-up金庫ダイヤル.
export function playTick(step = 0) {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const freq = 900 + Math.min(step, 30) * 18;
  tone(freq, t, 0.04, 0.06, "square", ac);
}

// Whoosh as the energy ball is flung into Needs (down sweep) or Wants (up sweep)
export function playWhoosh(dir: "NEEDS" | "WANTS") {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = "sawtooth";
  const [f0, f1] = dir === "WANTS" ? [320, 880] : [520, 180];
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f1, t + 0.35);
  gain.gain.setValueAtTime(0.14, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  osc.start(t);
  osc.stop(t + 0.45);
  noise(t, 0.18, 0.04, ac);
}

// Combo confirmation — pitch climbs with the streak length for an escalating reward feel
export function playCombo(level: number) {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const base = 660 + Math.min(level, 12) * 40;
  tone(base, t, 0.12, 0.16, "triangle", ac);
  tone(base * 1.25, t + 0.09, 0.16, 0.14, "sine", ac);
  if (level >= 3) tone(base * 1.5, t + 0.18, 0.22, 0.12, "sine", ac);
}
