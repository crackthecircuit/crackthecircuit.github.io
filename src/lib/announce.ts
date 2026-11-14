// One polite live region for the whole app (rendered by components/ui/Announcer). Anything can call announce().
let message = '';
let flip = false;
const listeners = new Set<() => void>();
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);

/** Tell screen-reader users what just happened (a wire connected, a run's result). */
export function announce(text: string) {
  // Alternate a trailing zero-width space so repeating the same message is still read out.
  flip = !flip;
  message = flip ? text : text + ZERO_WIDTH_SPACE;
  listeners.forEach((l) => l());
}

export const announcement = () => message;

export function subscribeAnnouncements(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
