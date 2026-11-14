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
      stars: { 'level-1': 3 },
      boards: { 'level-1': { nodes: [], wires: [] } },
      unlockedGates: ['XOR' as const],
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
      stars: { 'level-1': 2, 'level-2': 'lots', 'level-3': 9 },
      boards: { 'level-1': { nodes: [], wires: [] }, 'level-2': 'oops' },
      unlockedGates: ['XOR', 42],
    });
    expect(loadProgress(memoryStorage(raw))).toEqual({
      version: 1,
      stars: { 'level-1': 2 },
      boards: { 'level-1': { nodes: [], wires: [] } },
      unlockedGates: ['XOR'],
    });
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
