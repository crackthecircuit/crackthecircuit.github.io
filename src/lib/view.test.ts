import { describe, expect, it } from 'vitest';
import { BOARD_HEIGHT, BOARD_WIDTH } from './board';
import { clampView, FIT_VIEW, MAX_ZOOM, MIN_ZOOM, panBy, viewBoxOf, zoomAround } from './view';

describe('board view', () => {
  it('fits the whole board at zoom 1', () => {
    expect(viewBoxOf(FIT_VIEW)).toEqual({ x: 0, y: 0, width: BOARD_WIDTH, height: BOARD_HEIGHT });
  });

  it('cannot pan while the whole board fits', () => {
    expect(panBy(FIT_VIEW, 100, 50)).toEqual(FIT_VIEW);
  });

  it('keeps the anchor point fixed on screen while zooming', () => {
    const anchor = { x: 200, y: 150 };
    const before = viewBoxOf(FIT_VIEW);
    const zoomed = zoomAround(FIT_VIEW, anchor, 2);
    const after = viewBoxOf(zoomed);
    // The anchor sits at the same fraction across the view before and after.
    expect((anchor.x - after.x) / after.width).toBeCloseTo((anchor.x - before.x) / before.width);
    expect((anchor.y - after.y) / after.height).toBeCloseTo((anchor.y - before.y) / before.height);
  });

  it('clamps the zoom range', () => {
    expect(zoomAround(FIT_VIEW, FIT_VIEW.center, 100).zoom).toBe(MAX_ZOOM);
    expect(zoomAround(FIT_VIEW, FIT_VIEW.center, 0.01).zoom).toBe(MIN_ZOOM);
  });

  it('keeps a zoomed-in view on the board', () => {
    const box = viewBoxOf(panBy({ zoom: 2, center: FIT_VIEW.center }, 10_000, 10_000));
    expect(box.x).toBeCloseTo(0);
    expect(box.y).toBeCloseTo(0);
  });

  it('keeps the whole board visible when zoomed out', () => {
    const box = viewBoxOf(clampView({ zoom: 0.5, center: { x: 5000, y: -5000 } }));
    expect(box.x).toBeLessThanOrEqual(0);
    expect(box.y).toBeLessThanOrEqual(0);
    expect(box.x + box.width).toBeGreaterThanOrEqual(BOARD_WIDTH);
    expect(box.y + box.height).toBeGreaterThanOrEqual(BOARD_HEIGHT);
  });
});
