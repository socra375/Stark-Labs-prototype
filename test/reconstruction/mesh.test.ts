import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { chamferDepthField } from '../../src/reconstruction/depth';
import { buildPillowGeometry, buildPreviewPointCloud } from '../../src/reconstruction/mesh';

/** A 4x4 mask with a solid 2x2 foreground square in the middle — small enough to reason about
 * exactly, real enough to exercise the boundary logic (rim emission needs a non-trivial shape). */
function squareMask(): { mask: Uint8ClampedArray; width: number; height: number } {
  const width = 4;
  const height = 4;
  const mask = new Uint8ClampedArray(width * height);
  for (const [x, y] of [[1, 1], [2, 1], [1, 2], [2, 2]]) mask[y * width + x] = 255;
  return { mask, width, height };
}

describe('chamferDepthField', () => {
  it('is 0 everywhere the mask is background', () => {
    const { mask, width, height } = squareMask();
    const depth = chamferDepthField(mask, width, height);
    for (let i = 0; i < mask.length; i++) if (!mask[i]) expect(depth[i]).toBe(0);
  });

  it('normalizes so the pixel farthest from the boundary has depth 1', () => {
    const { mask, width, height } = squareMask();
    const depth = chamferDepthField(mask, width, height);
    let max = 0;
    for (let i = 0; i < depth.length; i++) if (depth[i] > max) max = depth[i];
    expect(max).toBeCloseTo(1, 5);
  });

  it('increases monotonically toward the shape interior, away from the background boundary', () => {
    // A 5-wide foreground strip: the center pixel is farther from both edges than pixel 1.
    const width = 5;
    const height = 1;
    const mask = new Uint8ClampedArray(width).fill(255);
    mask[0] = 0;
    mask[width - 1] = 0;
    const depth = chamferDepthField(mask, width, height);
    expect(depth[2]).toBeGreaterThan(depth[1]);
  });
});

describe('buildPillowGeometry', () => {
  it('produces a real BufferGeometry with two vertices per foreground pixel (front + back)', () => {
    const { mask, width, height } = squareMask();
    const depth = chamferDepthField(mask, width, height);
    const geometry = buildPillowGeometry(depth, mask, width, height);
    const foregroundCount = mask.reduce((n, v) => n + (v ? 1 : 0), 0);
    expect(geometry.attributes.position.count).toBe(foregroundCount * 2);
  });

  it('throws an honest error when the mask has no foreground pixels', () => {
    const width = 2;
    const height = 2;
    const mask = new Uint8ClampedArray(width * height); // all zero
    const depth = new Float32Array(width * height);
    expect(() => buildPillowGeometry(depth, mask, width, height)).toThrow(/no foreground/i);
  });

  it('computes real per-vertex normals (not a degenerate zero vector)', () => {
    const { mask, width, height } = squareMask();
    const depth = chamferDepthField(mask, width, height);
    const geometry = buildPillowGeometry(depth, mask, width, height);
    const normalAttr = geometry.attributes.normal;
    expect(normalAttr).toBeDefined();
    let anyNonZero = false;
    for (let i = 0; i < normalAttr.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(normalAttr, i);
      if (v.lengthSq() > 0.01) anyNonZero = true;
    }
    expect(anyNonZero).toBe(true);
  });
});

describe('buildPreviewPointCloud', () => {
  it('emits exactly one point (xyz triplet) per foreground pixel', () => {
    const { mask, width, height } = squareMask();
    const depth = chamferDepthField(mask, width, height);
    const points = buildPreviewPointCloud(depth, mask, width, height);
    const foregroundCount = mask.reduce((n, v) => n + (v ? 1 : 0), 0);
    expect(points.length).toBe(foregroundCount * 3);
  });
});
