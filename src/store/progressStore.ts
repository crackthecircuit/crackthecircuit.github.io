import { create } from 'zustand';
import type { Circuit, Level } from '../engine';
import { LEVELS } from '../levels/levels';
import { loadProgress, saveProgress } from './persistence';
import type { SavedProgress } from './persistence';

export interface ProgressState extends SavedProgress {
  /** Record a passing run. Keeps the best star count and applies the level's gate unlock. */
  recordPass: (level: Level, stars: number) => void;
  /** Autosave a level's board. */
  saveBoard: (levelId: string, circuit: Circuit) => void;
  /** Reveal a level's next hint (up to 3). Revealed hints stay revealed. */
  revealHint: (levelId: string) => void;
  /** Level 1 is always open; every other level opens once the level before it is passed, and stays open once passed. */
  isUnlocked: (levelId: string) => boolean;
  resetProgress: () => void;
  setMuted: (muted: boolean) => void;
}

/**
 * Add any gate a passed level unlocks. Saves from before NAND and NOR had to be earned (or before a level was
 * renamed) may have passed the level without recording the gate.
 */
function withEarnedGates(progress: SavedProgress): SavedProgress {
  const unlockedGates = [...progress.unlockedGates];
  for (const level of LEVELS) {
    const gate = level.unlocksGate;
    if (gate && progress.stars[level.id] && !unlockedGates.includes(gate)) unlockedGates.push(gate);
  }
  return { ...progress, unlockedGates };
}

export const useProgressStore = create<ProgressState>()((set, get) => {
  const persist = () => {
    const { version, stars, boards, unlockedGates, hints, muted } = get();
    saveProgress({ version, stars, boards, unlockedGates, hints, muted });
  };

  return {
    ...withEarnedGates(loadProgress()),

    recordPass: (level, stars) => {
      const state = get();
      const best = Math.max(state.stars[level.id] ?? 0, stars);
      const unlockedGates =
        level.unlocksGate && !state.unlockedGates.includes(level.unlocksGate)
          ? [...state.unlockedGates, level.unlocksGate]
          : state.unlockedGates;
      set({ stars: { ...state.stars, [level.id]: best }, unlockedGates });
      persist();
    },

    saveBoard: (levelId, circuit) => {
      set({ boards: { ...get().boards, [levelId]: circuit } });
      persist();
    },

    revealHint: (levelId) => {
      const shown = get().hints[levelId] ?? 0;
      if (shown >= 3) return;
      set({ hints: { ...get().hints, [levelId]: shown + 1 } });
      persist();
    },

    isUnlocked: (levelId) => {
      const index = LEVELS.findIndex((l) => l.id === levelId);
      if (index <= 0) return index === 0;
      const { stars } = get();
      return (stars[levelId] ?? 0) >= 1 || (stars[LEVELS[index - 1]!.id] ?? 0) >= 1;
    },

    resetProgress: () => {
      set({ stars: {}, boards: {}, unlockedGates: [], hints: {} });
      persist();
    },

    setMuted: (muted) => {
      set({ muted });
      persist();
    },
  };
});
