import * as THREE from 'three';
import type { ObjectManager } from '../core/ObjectManager';
import type { AssetManager } from '../3d/AssetManager';
import type { SceneSync } from '../3d/SceneSync';
import type { SceneObject, AssetRecord } from '../core/types';
import { toGeometryAssetRecord } from '../3d/import/ImportShared';
import { generateId } from '../utils/ids';

export interface SeparatePlan {
  targetId: string;
  targetSnapshot: SceneObject;
  targetAssetSnapshot: AssetRecord | null;
  newObjects: SceneObject[];
  newAssets: AssetRecord[]; // only non-empty for the union-find case
}

export type SeparatePlanResult = { ok: true; plan: SeparatePlan } | { ok: false; error: string };

class UnionFind {
  private parent: Int32Array;
  constructor(n: number) {
    this.parent = new Int32Array(n);
    for (let i = 0; i < n; i++) this.parent[i] = i;
  }
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[ra] = rb;
  }
}

/** Splits a geometry's connected components (triangle adjacency via shared vertices) into
 * separate BufferGeometry fragments, remapping each to a compact 0..k-1 index. */
function splitByConnectivity(geometry: THREE.BufferGeometry): THREE.BufferGeometry[] {
  const position = geometry.attributes.position;
  const vertexCount = position.count;
  const index = geometry.index ? geometry.index.array : sequentialIndex(vertexCount);

  const uf = new UnionFind(vertexCount);
  for (let i = 0; i < index.length; i += 3) {
    uf.union(index[i], index[i + 1]);
    uf.union(index[i + 1], index[i + 2]);
  }

  // Most geometry (primitives, merged/imported meshes) duplicates vertices per-face for correct
  // per-face normals/UVs — adjacent faces of a single solid share a 3D position but NOT a vertex
  // index. Without this, a plain box would (wrongly) look like 6 disconnected components. Union
  // any two vertex indices that occupy the exact same position, so "connected" means "touching in
  // 3D space", not "shares an index".
  const seenAtPosition = new Map<string, number>();
  for (let i = 0; i < vertexCount; i++) {
    const key = `${position.getX(i).toFixed(6)},${position.getY(i).toFixed(6)},${position.getZ(i).toFixed(6)}`;
    const existing = seenAtPosition.get(key);
    if (existing === undefined) seenAtPosition.set(key, i);
    else uf.union(existing, i);
  }

  const roots = new Set<number>();
  for (let i = 0; i < vertexCount; i++) roots.add(uf.find(i));
  if (roots.size <= 1) return [];

  const fragments: THREE.BufferGeometry[] = [];
  for (const root of roots) {
    const oldToNew = new Map<number, number>();
    const fragIndices: number[] = [];
    for (let i = 0; i < index.length; i += 3) {
      const a = index[i];
      const b = index[i + 1];
      const c = index[i + 2];
      if (uf.find(a) !== root) continue;
      for (const v of [a, b, c]) {
        if (!oldToNew.has(v)) oldToNew.set(v, oldToNew.size);
        fragIndices.push(oldToNew.get(v)!);
      }
    }
    if (!fragIndices.length) continue;

    const fragGeometry = new THREE.BufferGeometry();
    for (const attrName of Object.keys(geometry.attributes)) {
      const srcAttr = geometry.attributes[attrName];
      const itemSize = srcAttr.itemSize;
      const data = new Float32Array(oldToNew.size * itemSize);
      for (const [oldIdx, newIdx] of oldToNew) {
        for (let k = 0; k < itemSize; k++) data[newIdx * itemSize + k] = srcAttr.getComponent(oldIdx, k);
      }
      fragGeometry.setAttribute(attrName, new THREE.Float32BufferAttribute(data, itemSize));
    }
    fragGeometry.setIndex(fragIndices);
    fragGeometry.computeVertexNormals();
    fragGeometry.computeBoundingBox();
    fragGeometry.computeBoundingSphere();
    fragments.push(fragGeometry);
  }
  return fragments;
}

function sequentialIndex(n: number): number[] {
  const arr = new Array(n);
  for (let i = 0; i < n; i++) arr[i] = i;
  return arr;
}

/** Two real cases only: reverse a Join losslessly via metadata.joinedFrom, or split a genuinely
 * disconnected geometry via triangle-adjacency union-find. Never a fabricated split. */
export class SeparateTool {
  constructor(private objects: ObjectManager, private assets: AssetManager, private sceneSync: SceneSync) {}

  planSeparate(id: string): SeparatePlanResult {
    const target = this.objects.getOrThrow(id);
    const targetAssetSnapshot = target.geometry?.assetId ? (structuredClone(this.assets.get(target.geometry.assetId)!) ?? null) : null;

    if (target.metadata.joinedFrom?.length) {
      return {
        ok: true,
        plan: {
          targetId: id,
          targetSnapshot: structuredClone(target),
          targetAssetSnapshot,
          newObjects: target.metadata.joinedFrom.map((o) => structuredClone(o)),
          newAssets: [],
        },
      };
    }

    if (target.type !== 'mesh' || !target.geometry) return { ok: false, error: `"${target.name}" has no geometry to separate.` };
    const object3D = this.sceneSync.getObject3D(id);
    if (!(object3D instanceof THREE.Mesh)) return { ok: false, error: `"${target.name}" has no live geometry to analyze.` };

    const fragments = splitByConnectivity(object3D.geometry);
    if (fragments.length < 2) return { ok: false, error: 'No detectable seams — this object cannot be separated.' };

    const newAssets: AssetRecord[] = [];
    const newObjects: SceneObject[] = [];
    fragments.forEach((frag, i) => {
      const asset = toGeometryAssetRecord(frag, `${target.name} (Part ${i + 1})`);
      newAssets.push(asset);
      newObjects.push({
        id: generateId('mesh'),
        name: `${target.name} (Part ${i + 1})`,
        type: 'mesh',
        geometry: { type: 'imported', params: {}, assetId: asset.id },
        material: target.material,
        position: [...target.position],
        rotation: [...target.rotation],
        scale: [...target.scale],
        parentId: target.parentId,
        children: [],
        visible: true,
        locked: false,
        metadata: { origin: target.metadata.origin ?? 'build' },
      });
    });

    return { ok: true, plan: { targetId: id, targetSnapshot: structuredClone(target), targetAssetSnapshot, newObjects, newAssets } };
  }
}
