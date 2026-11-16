import { beforeEach, describe, expect, it } from 'vitest';
import { getLevel } from '../levels/levels';
import { useProgressStore } from './progressStore';

const store = () => useProgressStore.getState();

describe('progress store', () => {
  beforeEach(() => store().resetProgress());

  it('opens level 1 only, then each level after the previous one is passed', () => {
    expect(store().isUnlocked('both-switches')).toBe(true);
    expect(store().isUnlocked('either-switch')).toBe(false);
    store().recordPass(getLevel('both-switches')!, 1);
    expect(store().isUnlocked('either-switch')).toBe(true);
    expect(store().isUnlocked('opposite-day')).toBe(false);
    expect(store().isUnlocked('no-such-level')).toBe(false);
  });

  it('keeps a passed level open even when a new level is added before it', () => {
    store().recordPass(getLevel('smart-lamp')!, 3);
    expect(store().isUnlocked('smart-lamp')).toBe(true);
    expect(store().isUnlocked('the-vault')).toBe(true);
    expect(store().isUnlocked('nor-only')).toBe(false);
  });

  it('keeps the best star count when a level is replayed', () => {
    const level = getLevel('both-switches')!;
    store().recordPass(level, 3);
    store().recordPass(level, 1);
    expect(store().stars['both-switches']).toBe(3);
  });

  it('earns NAND, NOR and XOR by building them, once each', () => {
    store().recordPass(getLevel('opposite-day')!, 3);
    expect(store().unlockedGates).toEqual([]);
    store().recordPass(getLevel('not-both')!, 2);
    store().recordPass(getLevel('neither-switch')!, 3);
    store().recordPass(getLevel('exactly-one')!, 3);
    store().recordPass(getLevel('exactly-one')!, 3);
    expect(store().unlockedGates).toEqual(['NAND', 'NOR', 'XOR']);
  });

  it('remembers revealed hints per level, up to three, until progress is reset', () => {
    for (let i = 0; i < 5; i++) store().revealHint('either-switch');
    expect(store().hints).toEqual({ 'either-switch': 3 });
    store().resetProgress();
    expect(store().hints).toEqual({});
  });
});
