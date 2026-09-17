import * as THREE from 'three';
import type { ObjectManager } from '../core/ObjectManager';
import { composeMatrix, decomposeMatrix, invertMatrix, multiplyMatrices, type DecomposedTransform } from './TransformMath';

/**
 * Single source of truth for local<->world transform conversion. SceneObject.position/
 * rotation/scale are always local (relative to parentId). Any module needing world-space
 * (Inspector's world-space toggle, TransformGizmo drags, Mirror, Group/Ungroup reparenting,
 * BoundingBox/AnalysisEngine) must go through here instead of re-deriving the math.
 */
export class CoordinateSystem {
  constructor(private objects: ObjectManager) {}

  getLocalMatrix(objectId: string): THREE.Matrix4 {
    const obj = this.objects.getOrThrow(objectId);
    return composeMatrix(obj.position, obj.rotation, obj.scale);
  }

  getWorldMatrix(objectId: string): THREE.Matrix4 {
    const ancestors = this.objects.getAncestors(objectId); // immediate parent first
    let matrix = this.getLocalMatrix(objectId);
    for (const ancestor of ancestors) {
      matrix = multiplyMatrices(this.getLocalMatrix(ancestor.id), matrix);
    }
    return matrix;
  }

  getWorldTransform(objectId: string): DecomposedTransform {
    return decomposeMatrix(this.getWorldMatrix(objectId));
  }

  /** Given a desired world matrix and a target parent, returns the local transform that achieves it. */
  worldMatrixToLocal(worldMatrix: THREE.Matrix4, parentId: string | null): DecomposedTransform {
    if (!parentId) return decomposeMatrix(worldMatrix);
    const parentWorld = this.getWorldMatrix(parentId);
    const parentWorldInverse = invertMatrix(parentWorld);
    const local = multiplyMatrices(parentWorldInverse, worldMatrix);
    return decomposeMatrix(local);
  }

  /** Local transform of `objectId` if it were reparented to `newParentId` while keeping its current world pose. */
  reparentPreservingWorld(objectId: string, newParentId: string | null): DecomposedTransform {
    const world = this.getWorldMatrix(objectId);
    return this.worldMatrixToLocal(world, newParentId);
  }
}
