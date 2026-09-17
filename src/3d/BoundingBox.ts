import * as THREE from 'three';
import type { GeometryDefinition, SceneObject } from '../core/types';
import type { CoordinateSystem } from './CoordinateSystem';

/** Approximate local-space bounds for a geometry definition, from its params alone (no live mesh needed). */
export function localBoundsForGeometry(geometry: GeometryDefinition): THREE.Box3 {
  const p = geometry.params;
  let hx = 0.5, hy = 0.5, hz = 0.5;
  switch (geometry.type) {
    case 'box':
      hx = (p.width ?? 1) / 2; hy = (p.height ?? 1) / 2; hz = (p.depth ?? 1) / 2;
      break;
    case 'sphere':
      hx = hy = hz = p.radius ?? 0.5;
      break;
    case 'cylinder':
    case 'cone':
      hx = hz = Math.max(p.radiusTop ?? p.radius ?? 0.5, p.radiusBottom ?? p.radius ?? 0.5);
      hy = (p.height ?? 1) / 2;
      break;
    case 'capsule':
      hx = hz = p.radius ?? 0.4;
      hy = (p.length ?? 1) / 2 + (p.radius ?? 0.4);
      break;
    case 'plane':
      hx = (p.width ?? 1) / 2; hz = (p.height ?? 1) / 2; hy = 0.001;
      break;
    case 'torus':
      hx = hz = (p.radius ?? 0.5) + (p.tube ?? 0.15);
      hy = p.tube ?? 0.15;
      break;
  }
  return new THREE.Box3(new THREE.Vector3(-hx, -hy, -hz), new THREE.Vector3(hx, hy, hz));
}

/** World-space bounds of a single mesh object (geometry bounds transformed by its world matrix). */
export function worldBoundsForObject(obj: SceneObject, coords: CoordinateSystem): THREE.Box3 | null {
  if (!obj.geometry) return null;
  const local = localBoundsForGeometry(obj.geometry);
  const worldMatrix = coords.getWorldMatrix(obj.id);
  return local.applyMatrix4(worldMatrix);
}

/** World-space bounds across a set of objects (their own bounds only, not recursing into children). */
export function unionBounds(boxes: THREE.Box3[]): THREE.Box3 | null {
  if (!boxes.length) return null;
  const union = boxes[0].clone();
  for (let i = 1; i < boxes.length; i++) union.union(boxes[i]);
  return union;
}
