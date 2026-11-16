import { describe, expect, it } from 'vitest';
import { freshProgress, loadProgress, saveProgress, STORAGE_KEY } from './persistence';

function memoryStorage(initial?: string) {
  const data = new Map<string, string>(initial === undefined ? [] : [[STORAGE_KEY, initial]]);
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

describe('progress persistence', () => {
  it('round-trips saved progress', () => {
    const storage = memoryStorage();
    const progress = {
      ...freshProgress(),
      stars: { 'both-switches': 3 },
      boards: { 'both-switches': { nodes: [], wires: [] } },
      unlockedGates: ['XOR' as const],
      hints: { 'both-switches': 2 },
      muted: true,
    };
    expect(saveProgress(progress, storage)).toBe(true);
    expect(loadProgress(storage)).toEqual(progress);
  });

  it('starts fresh when nothing is saved, the data is corrupt, or the version is unknown', () => {
    expect(loadProgress(memoryStorage())).toEqual(freshProgress());
    expect(loadProgress(memoryStorage('{not json'))).toEqual(freshProgress());
    expect(loadProgress(memoryStorage(JSON.stringify({ version: 99, stars: { 'level-1': 3 } })))).toEqual(
      freshProgress(),
    );
    expect(loadProgress(undefined)).toEqual(freshProgress());
  });

  it('drops malformed entries but keeps the valid ones', () => {
    const raw = JSON.stringify({
      version: 1,
      stars: { 'both-switches': 2, 'either-switch': 'lots', 'opposite-day': 9 },
      boards: { 'both-switches': { nodes: [], wires: [] }, 'either-switch': 'oops' },
      unlockedGates: ['XOR', 42],
      hints: { 'both-switches': 1, 'either-switch': 7, 'opposite-day': 'all' },
    });
    expect(loadProgress(memoryStorage(raw))).toEqual({
      version: 1,
      stars: { 'both-switches': 2 },
      boards: { 'both-switches': { nodes: [], wires: [] } },
      unlockedGates: ['XOR'],
      hints: { 'both-switches': 1 },
      muted: false,
    });
  });

  it('renames numbered level ids from older saves', () => {
    const raw = JSON.stringify({
      version: 1,
      stars: { 'level-1': 3, 'level-16': 2 },
      boards: { 'level-6': { nodes: [], wires: [] } },
      unlockedGates: [],
      hints: { 'level-17': 1 },
    });
    const loaded = loadProgress(memoryStorage(raw));
    expect(loaded.stars).toEqual({ 'both-switches': 3, 'smart-lamp': 2 });
    expect(Object.keys(loaded.boards)).toEqual(['universal-gate']);
    expect(loaded.hints).toEqual({ 'selector-switch': 1 });
  });

  it('survives storage that throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(loadProgress(broken)).toEqual(freshProgress());
    expect(saveProgress(freshProgress(), broken)).toBe(false);
  });
});
