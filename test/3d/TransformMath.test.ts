import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { composeMatrix, decomposeMatrix, reflectMatrixAcrossPlane, invertMatrix, multiplyMatrices } from '../../src/3d/TransformMath';

function closeTo(a: number, b: number, eps = 1e-5): boolean {
  return Math.abs(a - b) < eps;
}

describe('TransformMath', () => {
  it('composeMatrix/decomposeMatrix round-trip position/rotation/scale', () => {
    const position: [number, number, number] = [1, 2, 3];
    const rotation: [number, number, number] = [0.1, 0.5, -0.2];
    const scale: [number, number, number] = [2, 1, 0.5];
    const matrix = composeMatrix(position, rotation, scale);
    const decomposed = decomposeMatrix(matrix);
    for (let i = 0; i < 3; i++) {
      expect(closeTo(decomposed.position[i], position[i])).toBe(true);
      expect(closeTo(decomposed.rotation[i], rotation[i])).toBe(true);
      expect(closeTo(decomposed.scale[i], scale[i])).toBe(true);
    }
  });

  it('reflectMatrixAcrossPlane negates the reflected axis and yields a proper rotation (det=+1)', () => {
    const matrix = composeMatrix([1, 2, 3], [0.3, 0, 0], [1, 1, 1]);
    const reflected = reflectMatrixAcrossPlane(matrix, 'x');
    const decomposed = decomposeMatrix(reflected);
    expect(closeTo(decomposed.position[0], -1)).toBe(true);
    expect(closeTo(decomposed.position[1], 2)).toBe(true);
    expect(closeTo(decomposed.position[2], 3)).toBe(true);

    // Extract the 3x3 rotation block and confirm det ~= +1 (a proper rotation, not a mirrored one
    // that would flip mesh winding/normals).
    const m = reflected.elements;
    const det =
      m[0] * (m[5] * m[10] - m[6] * m[9]) -
      m[4] * (m[1] * m[10] - m[2] * m[9]) +
      m[8] * (m[1] * m[6] - m[2] * m[5]);
    expect(closeTo(det, 1, 1e-4)).toBe(true);
  });

  it('reflecting twice across the same plane returns the original matrix', () => {
    const matrix = composeMatrix([1, -2, 3], [0.4, 0.1, 0.2], [1, 1, 1]);
    const twice = reflectMatrixAcrossPlane(reflectMatrixAcrossPlane(matrix, 'y'), 'y');
    for (let i = 0; i < 16; i++) expect(closeTo(twice.elements[i], matrix.elements[i])).toBe(true);
  });

  it('invertMatrix() undoes multiplyMatrices() (M^-1 * M = identity)', () => {
    const matrix = composeMatrix([5, -3, 2], [0.2, 0.4, 0.1], [1.5, 2, 0.5]);
    const identity = multiplyMatrices(invertMatrix(matrix), matrix);
    const id = new THREE.Matrix4();
    for (let i = 0; i < 16; i++) expect(closeTo(identity.elements[i], id.elements[i], 1e-4)).toBe(true);
  });
});
