import type { Circuit, GateType } from '../engine';

export const STORAGE_KEY = 'crackthecircuit:v1';
const VERSION = 1;

export interface SavedProgress {
  version: 1;
  /** Best star count per level id (1–3). A level is passed when it has an entry. */
  stars: Record<string, number>;
  /** Autosaved board per level id. */
  boards: Record<string, Circuit>;
  unlockedGates: GateType[];
  /** Hints revealed per level id (1–3). They stay revealed, and cap that level's stars. */
  hints: Record<string, number>;
  /** Sound effects off. A setting, so a progress reset keeps it. */
  muted: boolean;
}

export const freshProgress = (): SavedProgress => ({
  version: VERSION,
  stars: {},
  boards: {},
  unlockedGates: [],
  hints: {},
  muted: false,
});

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isCircuit = (v: unknown): v is Circuit =>
  isRecord(v) && Array.isArray(v.nodes) && Array.isArray(v.wires);

/** Read saved progress. Missing, corrupt or other-version data gives a fresh start instead of crashing. */
export function loadProgress(storage: StorageLike | undefined = safeLocalStorage()): SavedProgress {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return freshProgress();
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data) || data.version !== VERSION) return freshProgress();

    const stars: Record<string, number> = {};
    if (isRecord(data.stars)) {
      for (const [id, n] of Object.entries(data.stars)) {
        if (typeof n === 'number' && n >= 1 && n <= 3) stars[id] = Math.floor(n);
      }
    }
    const boards: Record<string, Circuit> = {};
    if (isRecord(data.boards)) {
      for (const [id, c] of Object.entries(data.boards)) if (isCircuit(c)) boards[id] = c;
    }
    const unlockedGates = Array.isArray(data.unlockedGates)
      ? data.unlockedGates.filter((g): g is GateType => typeof g === 'string')
      : [];
    const hints: Record<string, number> = {};
    if (isRecord(data.hints)) {
      for (const [id, n] of Object.entries(data.hints)) {
        if (typeof n === 'number' && n >= 1 && n <= 3) hints[id] = Math.floor(n);
      }
    }
    const muted = data.muted === true;
    return { version: VERSION, stars, boards, unlockedGates, hints, muted };
  } catch {
    return freshProgress();
  }
}

/** Write progress. Returns false if storage is unavailable or full; the game keeps working either way. */
export function saveProgress(
  progress: SavedProgress,
  storage: StorageLike | undefined = safeLocalStorage(),
): boolean {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

/** localStorage can be missing (tests) or throw on access (blocked site data, some private windows). */
function safeLocalStorage(): StorageLike | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}
