import * as THREE from 'three';
import type { Vec3 } from '../core/types';

export interface DecomposedTransform {
  position: Vec3;
  rotation: Vec3; // Euler radians, XYZ order
  scale: Vec3;
}

const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();

/** Composes a local Matrix4 from position/rotation(Euler XYZ)/scale. */
export function composeMatrix(position: Vec3, rotation: Vec3, scale: Vec3): THREE.Matrix4 {
  _euler.set(rotation[0], rotation[1], rotation[2], 'XYZ');
  _quat.setFromEuler(_euler);
  _pos.set(...position);
  _scale.set(...scale);
  return new THREE.Matrix4().compose(_pos, _quat, _scale);
}

/** Decomposes a Matrix4 back into position/Euler-rotation/scale. */
export function decomposeMatrix(matrix: THREE.Matrix4): DecomposedTransform {
  matrix.decompose(_pos, _quat, _scale);
  _euler.setFromQuaternion(_quat, 'XYZ');
  return {
    position: [_pos.x, _pos.y, _pos.z],
    rotation: [_euler.x, _euler.y, _euler.z],
    scale: [_scale.x, _scale.y, _scale.z],
  };
}

/**
 * Reflects a world-space rigid transform matrix across the plane through the world
 * origin perpendicular to `axis`. Uses proper matrix/quaternion conjugation (M' = F·M·F,
 * F = reflection matrix) rather than negating individual Euler components — this stays
 * correct for arbitrary compound rotations and yields a proper rotation (det=+1), so no
 * negative-scale hack is needed and mesh normals/winding stay correct.
 */
export function reflectMatrixAcrossPlane(matrix: THREE.Matrix4, axis: 'x' | 'y' | 'z'): THREE.Matrix4 {
  const d: [number, number, number] = axis === 'x' ? [-1, 1, 1] : axis === 'y' ? [1, -1, 1] : [1, 1, -1];
  const F = new THREE.Matrix4().makeScale(d[0], d[1], d[2]);
  return new THREE.Matrix4().multiplyMatrices(F, matrix).multiply(F);
}

export function invertMatrix(matrix: THREE.Matrix4): THREE.Matrix4 {
  return new THREE.Matrix4().copy(matrix).invert();
}

export function multiplyMatrices(a: THREE.Matrix4, b: THREE.Matrix4): THREE.Matrix4 {
  return new THREE.Matrix4().multiplyMatrices(a, b);
}
