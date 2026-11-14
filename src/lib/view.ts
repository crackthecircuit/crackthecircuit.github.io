import type { Point } from '../engine';
import { BOARD_HEIGHT, BOARD_WIDTH } from './board';

/**
 * What part of the board the workspace shows. `zoom` 1 fits the whole board; `center` is the world point in the
 * middle of the view. Stored positions never change, only the SVG viewBox does.
 */
export interface View {
  zoom: number;
  center: Point;
}

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3;
/** Zoom step for the + / − buttons. */
export const ZOOM_STEP = 1.25;

export const FIT_VIEW: View = { zoom: 1, center: { x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 } };

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Keep the zoom in range and the board in sight: zoomed in, the view stays on the board; zoomed out, the whole board stays visible. */
export function clampView(view: View): View {
  const zoom = clamp(view.zoom, MIN_ZOOM, MAX_ZOOM);
  const axis = (c: number, size: number) => {
    const half = size / (2 * zoom);
    return clamp(c, Math.min(half, size - half), Math.max(half, size - half));
  };
  return { zoom, center: { x: axis(view.center.x, BOARD_WIDTH), y: axis(view.center.y, BOARD_HEIGHT) } };
}

/** The SVG viewBox for a view. */
export function viewBoxOf(view: View): { x: number; y: number; width: number; height: number } {
  const width = BOARD_WIDTH / view.zoom;
  const height = BOARD_HEIGHT / view.zoom;
  return { x: view.center.x - width / 2, y: view.center.y - height / 2, width, height };
}

/** Zoom to `zoom`, keeping the world point `anchor` at the same place on screen. */
export function zoomAround(view: View, anchor: Point, zoom: number): View {
  const next = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  const k = view.zoom / next;
  return clampView({
    zoom: next,
    center: { x: anchor.x + (view.center.x - anchor.x) * k, y: anchor.y + (view.center.y - anchor.y) * k },
  });
}

/** Move the view by a world-space offset (dragging the board right moves the view left). */
export function panBy(view: View, dx: number, dy: number): View {
  return clampView({ ...view, center: { x: view.center.x - dx, y: view.center.y - dy } });
}
