import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ObjectManager } from '../core/ObjectManager';
import type { SceneSync } from '../3d/SceneSync';
import type { CoordinateSystem } from '../3d/CoordinateSystem';
import type { SceneObject, AssetRecord } from '../core/types';
import { toGeometryAssetRecord } from '../3d/import/ImportShared';
import { generateId } from '../utils/ids';

export interface JoinPlan {
  geometryAsset: AssetRecord;
  mergedObject: SceneObject;
  originalIds: string[];
  materialWarning?: string;
}

export type JoinPlanResult = { ok: true; plan: JoinPlan } | { ok: false; error: string };

/** Same commonParentOf semantics as GroupingManager: all selected ids must share the exact same
 * parentId, else the merged object lands at root. Small enough to duplicate rather than extract
 * a shared util for one 5-line helper, matching this codebase's per-tool-helper convention. */
function commonParentOf(objects: ObjectManager, ids: string[]): string | null {
  const first = objects.getOrThrow(ids[0]).parentId;
  return ids.every((id) => objects.getOrThrow(id).parentId === first) ? first : null;
}

/** Merges 2+ selected meshes into one real BufferGeometry (world-baked, single-material MVP).
 * Never touches Join's originals directly — planJoin() is pure, JoinCommand owns the mutation. */
export class JoinTool {
  constructor(
    private objects: ObjectManager,
    private sceneSync: SceneSync,
    private coords: CoordinateSystem,
  ) {}

  planJoin(ids: string[]): JoinPlanResult {
    if (ids.length < 2) return { ok: false, error: 'Select at least 2 objects to join.' };

    const originals: SceneObject[] = [];
    for (const id of ids) {
      const obj = this.objects.getOrThrow(id);
      if (obj.type !== 'mesh') return { ok: false, error: `Cannot join "${obj.name}" — it is a group, not a mesh. Select individual meshes.` };
      if (obj.children.length) return { ok: false, error: `Cannot join "${obj.name}" — it has its own children, which would be orphaned.` };
      originals.push(obj);
    }

    const geometries: THREE.BufferGeometry[] = [];
    for (const obj of originals) {
      const object3D = this.sceneSync.getObject3D(obj.id);
      if (!(object3D instanceof THREE.Mesh)) return { ok: false, error: `"${obj.name}" has no live geometry to merge.` };
      const geometry = object3D.geometry.clone();
      geometry.applyMatrix4(this.coords.getWorldMatrix(obj.id));
      geometries.push(geometry);
    }

    const merged = mergeGeometries(geometries, false);
    if (!merged) {
      return { ok: false, error: 'Cannot merge: the selected objects have incompatible geometry (mismatched attributes).' };
    }

    const parentId = commonParentOf(this.objects, ids);
    // "Identity local transform" means the object renders at the already-world-baked vertex
    // positions — i.e. the local transform that cancels the parent's own world transform out,
    // not literally position [0,0,0]/rotation [0,0,0]/scale [1,1,1] (which would double-apply
    // a non-root parent's transform on top of the world-baked geometry).
    const local = this.coords.worldMatrixToLocal(new THREE.Matrix4(), parentId);

    const geometryAsset = toGeometryAssetRecord(merged, `Joined (${originals.map((o) => o.name).join(' + ')})`);

    const firstMaterial = originals[0].material;
    const materialWarning = originals.some((o) => o.material !== firstMaterial)
      ? `Materials differ across the selection — using "${originals[0].name}"'s material. Nothing was blended.`
      : undefined;

    const mergedObject: SceneObject = {
      id: generateId('mesh'),
      name: `Joined (${originals.length} objects)`,
      type: 'mesh',
      geometry: { type: 'imported', params: {}, assetId: geometryAsset.id },
      material: firstMaterial,
      position: local.position,
      rotation: local.rotation,
      scale: local.scale,
      parentId,
      children: [],
      visible: true,
      locked: false,
      metadata: { origin: 'joined', joinedFrom: originals.map((o) => structuredClone(o)) },
    };

    return { ok: true, plan: { geometryAsset, mergedObject, originalIds: ids, materialWarning } };
  }
}
