import { describe, expect, it } from 'vitest';
import { CANVAS } from './board';
import {
  clampView,
  COMFORT_SCALE,
  EDGE_ZONE,
  edgePanStep,
  fitBox,
  MAX_SCALE,
  MIN_SCALE,
  openArea,
  panBy,
  screenToWorld,
  viewBoxOf,
  worldToScreen,
  zoomAround,
} from './view';
import type { View } from './view';

const size = { width: 800, height: 500 };
const home: View = { scale: 1, center: { x: 480, y: 300 } };

describe('canvas view', () => {
  it('gives the viewBox the shape of the element, so nothing is letterboxed', () => {
    const box = viewBoxOf({ scale: 2, center: { x: 100, y: 50 } }, size);
    expect(box).toEqual({ x: -100, y: -75, width: 400, height: 250 });
  });

  it('converts between screen and world points both ways', () => {
    const view: View = { scale: 0.75, center: { x: 300, y: -40 } };
    const world = { x: 123, y: 456 };
    const back = screenToWorld(view, size, worldToScreen(view, size, world));
    expect(back.x).toBeCloseTo(world.x);
    expect(back.y).toBeCloseTo(world.y);
    expect(worldToScreen(view, size, view.center)).toEqual({ x: 400, y: 250 });
  });

  it('keeps the anchor point fixed on screen while zooming', () => {
    const anchor = { x: 200, y: 150 };
    const before = worldToScreen(home, size, anchor);
    const after = worldToScreen(zoomAround(home, anchor, 2), size, anchor);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('clamps the zoom range', () => {
    expect(zoomAround(home, home.center, 100).scale).toBe(MAX_SCALE);
    expect(zoomAround(home, home.center, 0.01).scale).toBe(MIN_SCALE);
  });

  it('pans freely, but keeps the middle of the view on the canvas', () => {
    expect(panBy(home, 100, -50).center).toEqual({ x: 380, y: 350 });
    const far = clampView({ scale: 1, center: { x: 1e6, y: -1e6 } });
    expect(far.center).toEqual({ x: CANVAS.maxX, y: CANVAS.minY });
  });

  it('fits a box, but opens no smaller than the comfortable zoom', () => {
    const box = { minX: 0, minY: 0, maxX: 2000, maxY: 400 };
    const fitted = fitBox(box, size);
    // Everything fits…
    const vb = viewBoxOf(fitted, size);
    expect(vb.x).toBeLessThanOrEqual(box.minX);
    expect(vb.x + vb.width).toBeGreaterThanOrEqual(box.maxX);
    expect(fitted.center).toEqual({ x: 1000, y: 200 });
    // …unless that would shrink gates past finger size: then pan to see the rest.
    expect(fitted.scale).toBeLessThan(COMFORT_SCALE);
    const comfy = fitBox(box, size, true);
    expect(comfy.scale).toBe(COMFORT_SCALE);
    // It starts at the left (the switches) rather than in the middle of an empty stretch.
    expect(viewBoxOf(comfy, size).x).toBeLessThanOrEqual(box.minX);
    expect(viewBoxOf(comfy, size).x).toBeGreaterThan(box.minX - 100);
  });

  it('fits the circuit into the part the floating panels leave open', () => {
    const box = { minX: 0, minY: 0, maxX: 400, maxY: 200 };
    const insets = { top: 60, right: 340, bottom: 80, left: 0 };
    const view = fitBox(box, size, false, insets);
    const open = openArea(size, insets);
    const topLeft = worldToScreen(view, size, { x: box.minX, y: box.minY });
    const bottomRight = worldToScreen(view, size, { x: box.maxX, y: box.maxY });
    expect(topLeft.x).toBeGreaterThanOrEqual(open.x);
    expect(topLeft.y).toBeGreaterThanOrEqual(open.y);
    expect(bottomRight.x).toBeLessThanOrEqual(open.x + open.width);
    expect(bottomRight.y).toBeLessThanOrEqual(open.y + open.height);
    // Centred in the open area.
    expect((topLeft.x + bottomRight.x) / 2).toBeCloseTo(open.x + open.width / 2);
  });

  it('scrolls faster the nearer the pointer is to an edge, and not at all away from it', () => {
    expect(edgePanStep({ x: 400, y: 250 }, size)).toEqual({ x: 0, y: 0 });
    const nearLeft = edgePanStep({ x: EDGE_ZONE / 2, y: 250 }, size);
    const atLeft = edgePanStep({ x: 0, y: 250 }, size);
    expect(nearLeft.x).toBeLessThan(0);
    expect(atLeft.x).toBeLessThan(nearLeft.x);
    expect(edgePanStep({ x: 400, y: size.height - 1 }, size).y).toBeGreaterThan(0);
  });
});
