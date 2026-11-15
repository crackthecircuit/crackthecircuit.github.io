import { useSyncExternalStore } from 'react';

/** Whether a CSS media query matches, updating when it changes (rotation, window resize). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches,
    () => false,
  );
}

/** A touch screen (no fine pointer such as a mouse). */
export const COARSE_POINTER = '(pointer: coarse)';


/**
 * A phone, either way up: the editing screens switch to one full-screen board with a gate tray and a sheet.
 * Keep in step with the same query in the CSS modules (LevelScreen, Palette, ResultCard, editor).
 */
export const PHONE = '(max-width: 600px), (max-height: 480px)';
