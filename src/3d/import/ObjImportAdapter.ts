import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import type { AssetRecord } from '../../core/types';
import type { ImportResult } from './ModelImporter';
import { buildSceneObjectTree, toGeometryAssetRecord, defaultCustomMaterial, stripExtension } from './ImportShared';

const loader = new OBJLoader();

/** OBJ carries no PBR material data of its own (an accompanying .mtl isn't handled by this MVP —
 * a single File is all pickFile() gives us) — every mesh in the file shares one default 'custom'
 * material, never a fabricated preset. */
export function importObj(buf: ArrayBuffer, filename: string): ImportResult {
  const text = new TextDecoder().decode(buf);
  const group = loader.parse(text);

  const baseName = stripExtension(filename);
  const material = defaultCustomMaterial(baseName);
  const assets: AssetRecord[] = [];
  const geometryIds = new Map<THREE.BufferGeometry, string>();

  const resolveMaterial = (): string => material.id;
  const resolveGeometry = (mesh: THREE.Mesh): string => {
    const existing = geometryIds.get(mesh.geometry);
    if (existing) return existing;
    const record = toGeometryAssetRecord(mesh.geometry, mesh.name || baseName);
    assets.push(record);
    geometryIds.set(mesh.geometry, record.id);
    return record.id;
  };

  const objects = buildSceneObjectTree(group, baseName, { resolveMaterial, resolveGeometry });
  return { objects, materials: [material], assets };
}
