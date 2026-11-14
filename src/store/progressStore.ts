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
  /** Level 1 is always open; every other level opens once the level before it is passed. */
  isUnlocked: (levelId: string) => boolean;
  resetProgress: () => void;
  setMuted: (muted: boolean) => void;
}

export const useProgressStore = create<ProgressState>()((set, get) => {
  const persist = () => {
    const { version, stars, boards, unlockedGates, muted } = get();
    saveProgress({ version, stars, boards, unlockedGates, muted });
  };

  return {
    ...loadProgress(),

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

    isUnlocked: (levelId) => {
      const index = LEVELS.findIndex((l) => l.id === levelId);
      if (index <= 0) return index === 0;
      return (get().stars[LEVELS[index - 1]!.id] ?? 0) >= 1;
    },

    resetProgress: () => {
      set({ stars: {}, boards: {}, unlockedGates: [] });
      persist();
    },

    setMuted: (muted) => {
      set({ muted });
      persist();
    },
  };
});
