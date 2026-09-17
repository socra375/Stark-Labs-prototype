import * as THREE from 'three';
import type { ObjectManager } from '../core/ObjectManager';
import type { CoordinateSystem } from '../3d/CoordinateSystem';
import { invertMatrix, multiplyMatrices } from '../3d/TransformMath';

/**
 * Drives multi-object transforms through a synthetic pivot (centroid of the selection):
 * the gizmo attaches to this invisible Object3D instead of any single selected mesh, and
 * every drag tick re-derives each selected object's new local transform from the pivot's
 * world-matrix delta. Kept out of objectRoot so it never becomes a pickable/selectable object.
 */
export class GroupTransformPivot {
  readonly object3D = new THREE.Object3D();
  private objectIds: string[] = [];
  private initialPivotMatrix = new THREE.Matrix4();
  private initialWorldMatrices = new Map<string, THREE.Matrix4>();

  constructor(private objects: ObjectManager, private coords: CoordinateSystem, scene: THREE.Scene) {
    scene.add(this.object3D);
  }

  begin(objectIds: string[]): void {
    this.objectIds = objectIds;
    const centroid = new THREE.Vector3();
    for (const id of objectIds) {
      const t = this.coords.getWorldTransform(id);
      centroid.add(new THREE.Vector3(...t.position));
    }
    centroid.divideScalar(objectIds.length || 1);

    this.object3D.position.copy(centroid);
    this.object3D.rotation.set(0, 0, 0);
    this.object3D.scale.set(1, 1, 1);
    this.object3D.updateMatrix();
    this.initialPivotMatrix.copy(this.object3D.matrix);

    this.initialWorldMatrices.clear();
    for (const id of objectIds) this.initialWorldMatrices.set(id, this.coords.getWorldMatrix(id));
  }

  /** Called on every gizmo drag tick: re-derives and applies each object's local transform. */
  applyDelta(): void {
    this.object3D.updateMatrix();
    const delta = multiplyMatrices(this.object3D.matrix, invertMatrix(this.initialPivotMatrix));
    for (const id of this.objectIds) {
      const initialWorld = this.initialWorldMatrices.get(id);
      if (!initialWorld) continue;
      const newWorld = multiplyMatrices(delta, initialWorld);
      const obj = this.objects.getOrThrow(id);
      const newLocal = this.coords.worldMatrixToLocal(newWorld, obj.parentId);
      this.objects.update(id, { ...newLocal });
    }
  }

  end(): void {
    this.objectIds = [];
    this.initialWorldMatrices.clear();
  }

  dispose(): void {
    this.object3D.removeFromParent();
  }
}
