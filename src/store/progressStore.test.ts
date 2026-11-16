import { beforeEach, describe, expect, it } from 'vitest';
import { getLevel } from '../levels/levels';
import { useProgressStore } from './progressStore';

const store = () => useProgressStore.getState();

describe('progress store', () => {
  beforeEach(() => store().resetProgress());

  it('opens level 1 only, then each level after the previous one is passed', () => {
    expect(store().isUnlocked('level-1')).toBe(true);
    expect(store().isUnlocked('level-2')).toBe(false);
    store().recordPass(getLevel('level-1')!, 1);
    expect(store().isUnlocked('level-2')).toBe(true);
    expect(store().isUnlocked('level-3')).toBe(false);
    expect(store().isUnlocked('no-such-level')).toBe(false);
  });

  it('keeps the best star count when a level is replayed', () => {
    const level = getLevel('level-1')!;
    store().recordPass(level, 3);
    store().recordPass(level, 1);
    expect(store().stars['level-1']).toBe(3);
  });

  it('unlocks XOR when level 8 is passed, once', () => {
    store().recordPass(getLevel('level-7')!, 3);
    expect(store().unlockedGates).toEqual([]);
    store().recordPass(getLevel('level-8')!, 2);
    store().recordPass(getLevel('level-8')!, 3);
    expect(store().unlockedGates).toEqual(['XOR']);
  });

  it('remembers revealed hints per level, up to three, until progress is reset', () => {
    for (let i = 0; i < 5; i++) store().revealHint('level-2');
    expect(store().hints).toEqual({ 'level-2': 3 });
    store().resetProgress();
    expect(store().hints).toEqual({});
  });
});
