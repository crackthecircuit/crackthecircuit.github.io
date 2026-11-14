import { create } from 'zustand';
import { getLevel } from '../levels/levels';

export type Screen = { name: 'title' } | { name: 'map' } | { name: 'level'; levelId: string };

/** The current screen lives in the URL hash (#/map, #/level/3) so refresh and the back button work. */
export function parseHash(hash: string): Screen {
  const path = hash.replace(/^#\/?/, '');
  if (path === 'map') return { name: 'map' };
  const match = /^level\/(\d+)$/.exec(path);
  if (match && getLevel(`level-${match[1]}`)) return { name: 'level', levelId: `level-${match[1]}` };
  return { name: 'title' };
}

export function screenHash(screen: Screen): string {
  switch (screen.name) {
    case 'title':
      return '#/';
    case 'map':
      return '#/map';
    case 'level':
      return `#/level/${screen.levelId.replace('level-', '')}`;
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
