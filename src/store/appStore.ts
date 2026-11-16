import { create } from 'zustand';
import { LEGACY_LEVEL_IDS } from '../levels/legacy';
import { getLevel } from '../levels/levels';

export type Screen =
  { name: 'title' } | { name: 'map' } | { name: 'sandbox' } | { name: 'level'; levelId: string };

/**
 * The current screen lives in the URL hash (#/map, #/sandbox, #/level/smart-lamp) so refresh and the back button
 * work. Old numbered links (#/level/3) still open the level they used to.
 */
export function parseHash(hash: string): Screen {
  const path = hash.replace(/^#\/?/, '');
  if (path === 'map') return { name: 'map' };
  if (path === 'sandbox') return { name: 'sandbox' };
  const match = /^level\/([a-z0-9-]+)$/.exec(path);
  if (match) {
    const id = LEGACY_LEVEL_IDS[`level-${match[1]}`] ?? match[1]!;
    if (getLevel(id)) return { name: 'level', levelId: id };
  }
  return { name: 'title' };
}

export function screenHash(screen: Screen): string {
  switch (screen.name) {
    case 'title':
      return '#/';
    case 'map':
      return '#/map';
    case 'sandbox':
      return '#/sandbox';
    case 'level':
      return `#/level/${screen.levelId}`;
  }
}

interface AppState {
  screen: Screen;
  go: (screen: Screen) => void;
}

const initialHash = typeof location === 'undefined' ? '' : location.hash;

export const useAppStore = create<AppState>()((set) => ({
  screen: parseHash(initialHash),
  go: (screen) => {
    if (typeof location !== 'undefined' && location.hash !== screenHash(screen))
      location.hash = screenHash(screen);
    set({ screen });
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => useAppStore.setState({ screen: parseHash(location.hash) }));
}
