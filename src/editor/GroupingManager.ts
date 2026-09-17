import * as THREE from 'three';
import type { ObjectManager } from '../core/ObjectManager';
import type { CoordinateSystem } from '../3d/CoordinateSystem';
import type { SceneObject, Vec3 } from '../core/types';
import { decomposeMatrix, invertMatrix, multiplyMatrices } from '../3d/TransformMath';
import { generateId } from '../utils/ids';

export interface ReparentPlan {
  objectId: string;
  oldParentId: string | null;
  oldLocal: { position: Vec3; rotation: Vec3; scale: Vec3 };
  newParentId: string | null;
  newLocal: { position: Vec3; rotation: Vec3; scale: Vec3 };
}

export interface GroupPlan {
  group: SceneObject;
  reparents: ReparentPlan[];
}

/**
 * Group = a real parent SceneObject created purely to transform several existing pieces
 * together (distinct from Assembly/Connect, which records a structural relationship without
 * touching parentId). Ungroup removes that node and restores children's original parent,
 * preserving world pose via CoordinateSystem/TransformMath — never approximated.
 */
export class GroupingManager {
  constructor(private objects: ObjectManager, private coords: CoordinateSystem) {}

  planGroup(selectedIds: string[], groupName = 'Group'): GroupPlan | null {
    if (selectedIds.length < 2) return null;

    const commonParent = this.commonParentOf(selectedIds);
    const worldPositions = selectedIds.map((id) => {
      const t = this.coords.getWorldTransform(id);
      return new THREE.Vector3(...t.position);
    });
    const centroid = worldPositions.reduce((acc, p) => acc.add(p), new THREE.Vector3()).divideScalar(worldPositions.length);

    // Group's own local transform: relative to commonParent if any, else world (root).
    const groupWorldMatrix = new THREE.Matrix4().makeTranslation(centroid.x, centroid.y, centroid.z);
    const groupLocal = commonParent
      ? decomposeMatrix(multiplyMatrices(invertMatrix(this.coords.getWorldMatrix(commonParent)), groupWorldMatrix))
      : decomposeMatrix(groupWorldMatrix);

    const group: SceneObject = {
      id: generateId('grp'),
      name: groupName,
      type: 'group',
      position: groupLocal.position,
      rotation: groupLocal.rotation,
      scale: [1, 1, 1],
      parentId: commonParent,
      children: [],
      visible: true,
      locked: false,
      metadata: {},
    };

    const reparents: ReparentPlan[] = selectedIds.map((id) => {
      const obj = this.objects.getOrThrow(id);
      const objWorld = this.coords.getWorldMatrix(id);
      const newLocal = decomposeMatrix(multiplyMatrices(invertMatrix(groupWorldMatrix), objWorld));
      return {
        objectId: id,
        oldParentId: obj.parentId,
        oldLocal: { position: [...obj.position], rotation: [...obj.rotation], scale: [...obj.scale] },
        newParentId: group.id,
        newLocal,
      };
    });

    return { group, reparents };
  }

  planUngroup(groupId: string): GroupPlan | null {
    const group = this.objects.get(groupId);
    if (!group || group.type !== 'group') return null;
    const children = this.objects.getChildren(groupId);
    const parentWorld = group.parentId ? this.coords.getWorldMatrix(group.parentId) : new THREE.Matrix4();

    const reparents: ReparentPlan[] = children.map((child) => {
      const childWorld = this.coords.getWorldMatrix(child.id);
      const newLocal = decomposeMatrix(multiplyMatrices(invertMatrix(parentWorld), childWorld));
      return {
        objectId: child.id,
        oldParentId: groupId,
        oldLocal: { position: [...child.position], rotation: [...child.rotation], scale: [...child.scale] },
        newParentId: group.parentId,
        newLocal,
      };
    });

    return { group: structuredClone(group), reparents };
  }

  private commonParentOf(ids: string[]): string | null {
    const parents = new Set(ids.map((id) => this.objects.get(id)?.parentId ?? null));
    return parents.size === 1 ? [...parents][0] : null;
  }
}
