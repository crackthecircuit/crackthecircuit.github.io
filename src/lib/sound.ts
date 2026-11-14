// Sound effects, synthesised with the Web Audio API: no audio files, no dependencies.
// Every sound is a few short notes with a fast attack and an exponential decay.
import type { Circuit, GateNode } from '../engine';
import { useProgressStore } from '../store/progressStore';

export type SoundName =
  | 'place' // a gate added
  | 'drop' // a gate moved
  | 'connect' // a wire made
  | 'remove' // a gate or wire deleted
  | 'resize' // a gate widened or narrowed, inputs changed
  | 'reject' // a wire refused
  | 'rowPass' // a truth-table row ticks ✓ during the sweep
  | 'rowFail' // … or ✗
  | 'invalid' // Run blocked by validation errors
  | 'fail' // a run that didn't pass every row
  | 'success' // every row passed
  | 'star' // one star on the result card (pass the star's index)
  | 'unlock'; // a new gate earned

type Wave = OscillatorType;
interface Note {
  freq: number;
  /** Start, seconds after the sound begins. */
  at?: number;
  dur: number;
  wave?: Wave;
  gain?: number;
  /** Frequency to slide to by the end of the note. */
  to?: number;
}

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;

const SOUNDS: Record<SoundName, (index: number) => Note[]> = {
  place: () => [
    { freq: 520, dur: 0.05, wave: 'triangle' },
    { freq: 780, at: 0.04, dur: 0.07, wave: 'triangle' },
  ],
  drop: () => [{ freq: 330, dur: 0.05, wave: 'sine', gain: 0.6 }],
  connect: () => [
    { freq: 880, dur: 0.04, wave: 'triangle' },
    { freq: 1320, at: 0.035, dur: 0.06, wave: 'triangle', gain: 0.8 },
  ],
  remove: () => [{ freq: 420, to: 220, dur: 0.11, wave: 'triangle' }],
  resize: () => [{ freq: 700, dur: 0.04, wave: 'sine' }],
  reject: () => [
    { freq: 150, dur: 0.06, wave: 'square', gain: 0.35 },
    { freq: 130, at: 0.08, dur: 0.07, wave: 'square', gain: 0.35 },
  ],
  rowPass: (i) => [{ freq: 900 + (i % 8) * 45, dur: 0.035, wave: 'sine', gain: 0.45 }],
  rowFail: () => [{ freq: 260, dur: 0.05, wave: 'triangle', gain: 0.6 }],
  invalid: () => [
    { freq: 196, dur: 0.09, wave: 'square', gain: 0.3 },
    { freq: 165, at: 0.1, dur: 0.12, wave: 'square', gain: 0.3 },
  ],
  fail: () => [
    { freq: 392, dur: 0.1, wave: 'triangle' },
    { freq: 294, at: 0.11, dur: 0.18, wave: 'triangle' },
  ],
  success: () =>
    [C5, E5, G5, C6].map((freq, i) => ({ freq, at: i * 0.07, dur: i === 3 ? 0.3 : 0.1, wave: 'triangle' })),
  star: (i) => [
    { freq: [E5, G5, C6][i] ?? C6, dur: 0.18, wave: 'sine' },
    { freq: ([E5, G5, C6][i] ?? C6) * 2, dur: 0.12, wave: 'sine', gain: 0.25 },
  ],
  unlock: () =>
    [G5, C6, E5 * 2, G5 * 2].map((freq, i) => ({ freq, at: i * 0.06, dur: 0.12, wave: 'sine', gain: 0.7 })),
};

const MASTER_GAIN = 0.18;
let context: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return null;
  try {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = MASTER_GAIN;
      master.connect(context.destination);
    }
    // Browsers start the context suspended until a user gesture; every sound follows one.
    if (context.state === 'suspended') void context.resume();
    return { ctx: context, out: master! };
  } catch {
    return null;
  }
}

/** Play a sound effect, unless the player has muted them. `index` varies some sounds (row number, star number). */
export function playSound(name: SoundName, index = 0, delay = 0) {
  if (useProgressStore.getState().muted) return;
  const a = audio();
  if (!a) return;
  const { ctx, out } = a;
  const start = ctx.currentTime + delay + 0.005;
  for (const note of SOUNDS[name](index)) {
    const t = start + (note.at ?? 0);
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = note.wave ?? 'sine';
    osc.frequency.setValueAtTime(note.freq, t);
    if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to, t + note.dur);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(note.gain ?? 1, t + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, t + note.dur);
    osc.connect(env).connect(out);
    osc.start(t);
    osc.stop(t + note.dur + 0.02);
  }
}

/** The sound an edit makes, found by comparing the board before and after (null for no audible change). */
export function editSound(before: Circuit, after: Circuit): SoundName | null {
  const gates = (c: Circuit) => c.nodes.filter((n): n is GateNode => n.kind === 'gate');
  const inputs = (c: Circuit) => c.nodes.filter((n) => n.kind === 'input').length;
  const [g0, g1] = [gates(before), gates(after)];
  if (inputs(before) !== inputs(after)) return 'resize';
  if (g1.length > g0.length) return 'place';
  if (g1.length < g0.length) return 'remove';
  const old = new Map(g0.map((g) => [g.id, g]));
  if (g1.some((g) => old.get(g.id)?.inputs !== g.inputs)) return 'resize';
  if (after.wires.length > before.wires.length) return 'connect';
  if (after.wires.length < before.wires.length) return 'remove';
  const key = (c: Circuit) =>
    c.wires
      .map((w) => `${w.from.nodeId}>${w.to.nodeId}.${w.to.port}`)
      .sort()
      .join();
  if (key(before) !== key(after)) return 'connect';
  if (g1.some((g) => old.get(g.id)?.pos.x !== g.pos.x || old.get(g.id)?.pos.y !== g.pos.y)) return 'drop';
  return null;
}
