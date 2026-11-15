import type { Point } from '../engine';
import { CANVAS } from './board';

/**
 * What part of the canvas the workspace shows: `scale` is screen pixels per board unit (1 = 100%) and `center` is the
 * world point in the middle of the view. Stored positions never change, only the SVG viewBox does.
 */
export interface View {
  scale: number;
  center: Point;
}

/** The workspace element's size in screen pixels. */
export interface Size {
  width: number;
  height: number;
}

/** How much of each edge of the workspace the floating panels and toolbar cover (screen pixels). */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/** The part of an element of `size` that `insets` leave uncovered, relative to the element's top-left corner. */
export function openArea(size: Size, insets: Insets): { x: number; y: number; width: number; height: number } {
  return {
    x: insets.left,
    y: insets.top,
    width: Math.max(size.width - insets.left - insets.right, 1),
    height: Math.max(size.height - insets.top - insets.bottom, 1),
  };
}

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 3;
/** A level opens no smaller than this, so gates stay finger-sized on a phone. */
export const COMFORT_SCALE = 0.6;
/** Zoom step for the + / − buttons. */
export const ZOOM_STEP = 1.25;
/** Room (board units) left around the circuit when fitting it. */
const FIT_PADDING = 48;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Keep the zoom in range and the middle of the view on the canvas. */
export function clampView(view: View): View {
  return {
    scale: clamp(view.scale, MIN_SCALE, MAX_SCALE),
    center: {
      x: clamp(view.center.x, CANVAS.minX, CANVAS.maxX),
      y: clamp(view.center.y, CANVAS.minY, CANVAS.maxY),
    },
  };
}

/** The SVG viewBox for a view on an element of `size`: the same shape as the element, so nothing is letterboxed. */
export function viewBoxOf(view: View, size: Size): { x: number; y: number; width: number; height: number } {
  const width = size.width / view.scale;
  const height = size.height / view.scale;
  return { x: view.center.x - width / 2, y: view.center.y - height / 2, width, height };
}

/** A screen point, relative to the element's top-left corner, as a world point. */
export function screenToWorld(view: View, size: Size, p: Point): Point {
  return {
    x: view.center.x + (p.x - size.width / 2) / view.scale,
    y: view.center.y + (p.y - size.height / 2) / view.scale,
  };
}

/** A world point as a screen point relative to the element's top-left corner. */
export function worldToScreen(view: View, size: Size, p: Point): Point {
  return {
    x: size.width / 2 + (p.x - view.center.x) * view.scale,
    y: size.height / 2 + (p.y - view.center.y) * view.scale,
  };
}

/** Zoom to `scale`, keeping the world point `anchor` at the same place on screen. */
export function zoomAround(view: View, anchor: Point, scale: number): View {
  const next = clamp(scale, MIN_SCALE, MAX_SCALE);
  const k = view.scale / next;
  return clampView({
    scale: next,
    center: { x: anchor.x + (view.center.x - anchor.x) * k, y: anchor.y + (view.center.y - anchor.y) * k },
  });
}

/** Move the view by a world-space offset (dragging the canvas right moves the view left). */
export function panBy(view: View, dx: number, dy: number): View {
  return clampView({ ...view, center: { x: view.center.x - dx, y: view.center.y - dy } });
}

/** A rectangle in world units. */
export interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * The view that shows all of `box` on an element of `size`. With `comfort`, never zoom out past COMFORT_SCALE; when
 * the box then doesn't fit, the view starts at its left (the switches: circuits flow left to right) and top, and the
 * rest is reached by panning.
 */
export function fitBox(box: Box, size: Size, comfort = false, insets: Insets = NO_INSETS): View {
  const open = openArea(size, insets);
  const w = box.maxX - box.minX + FIT_PADDING * 2;
  const h = box.maxY - box.minY + FIT_PADDING * 2;
  let scale = clamp(Math.min(open.width / w, open.height / h), MIN_SCALE, MAX_SCALE);
  if (comfort) scale = Math.max(scale, COMFORT_SCALE);
  const viewW = open.width / scale;
  const viewH = open.height / scale;
  // The world point that should sit in the middle of the open area…
  const target = {
    x: viewW >= w ? (box.minX + box.maxX) / 2 : box.minX - FIT_PADDING + viewW / 2,
    y: viewH >= h ? (box.minY + box.maxY) / 2 : box.minY - FIT_PADDING + viewH / 2,
  };
  // …and the open area's middle is this far from the element's middle.
  const dx = (insets.left - insets.right) / 2 / scale;
  const dy = (insets.top - insets.bottom) / 2 / scale;
  return clampView({ scale, center: { x: target.x - dx, y: target.y - dy } });
}

/**
 * Edge pan: how far (screen pixels) to scroll this frame for a pointer at `p` (relative to the element), faster the
 * closer it is to an edge. Positive x scrolls the view right, to show what is right of it.
 */
export const EDGE_ZONE = 40;
const EDGE_SPEED = 14;
export function edgePanStep(p: Point, size: Size): Point {
  const push = (d: number) => (d < EDGE_ZONE ? ((EDGE_ZONE - Math.max(d, 0)) / EDGE_ZONE) * EDGE_SPEED : 0);
  return {
    x: push(size.width - p.x) - push(p.x),
    y: push(size.height - p.y) - push(p.y),
  };
}
