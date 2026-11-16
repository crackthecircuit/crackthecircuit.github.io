/**
 * Level ids before levels had stable names (`level-<number>` in the original 18-level order). Saved progress
 * and old `#/level/<number>` links are moved over with this table.
 */
export const LEGACY_LEVEL_IDS: Record<string, string> = {
  'level-1': 'both-switches',
  'level-2': 'either-switch',
  'level-3': 'opposite-day',
  'level-4': 'not-both',
  'level-5': 'neither-switch',
  'level-6': 'universal-gate',
  'level-7': 'three-way-switch',
  'level-8': 'exactly-one',
  'level-9': 'odd-one-out',
  'level-10': 'the-vault',
  'level-11': 'four-key-lock',
  'level-12': 'any-alarm',
  'level-13': 'two-pairs',
  'level-14': 'even-count',
  'level-15': 'security-system',
  'level-16': 'smart-lamp',
  'level-17': 'selector-switch',
  'level-18': 'vending-machine',
};

/** The current id for a saved level id: legacy ids are renamed, anything else is kept. */
export const currentLevelId = (id: string) => LEGACY_LEVEL_IDS[id] ?? id;
