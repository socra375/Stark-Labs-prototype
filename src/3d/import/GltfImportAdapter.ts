import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AssetRecord, MaterialDefinition } from '../../core/types';
import type { ImportResult } from './ModelImporter';
import { buildSceneObjectTree, toGeometryAssetRecord, defaultCustomMaterial, stripExtension } from './ImportShared';

const loader = new GLTFLoader();

/**
 * Known, honest scope boundary: Draco/KTX2-compressed glTFs fail with the loader's own clear
 * error (no decoder wired here — out of scope for M15). A plain .gltf referencing external
 * (non-data-URI) .bin/texture files also fails to resolve those URIs, since only one File is
 * available — .glb and self-contained .gltf are the supported cases. Both failures propagate
 * as real errors, never a silent partial import.
 */
export async function importGltf(buf: ArrayBuffer, filename: string): Promise<ImportResult> {
  const gltf = await loader.parseAsync(buf, '');

  const materials: MaterialDefinition[] = [];
  const materialIds = new Map<THREE.Material, string>();
  const assets: AssetRecord[] = [];
  const geometryIds = new Map<THREE.BufferGeometry, string>();

  const resolveMaterial = (mesh: THREE.Mesh): string | undefined => {
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!mat) return undefined;
    const existing = materialIds.get(mat);
    if (existing) return existing;
    const def = mapGltfMaterial(mat, mesh.name || mat.name || 'Imported Material');
    materials.push(def);
    materialIds.set(mat, def.id);
    return def.id;
  };

  const resolveGeometry = (mesh: THREE.Mesh): string => {
    const existing = geometryIds.get(mesh.geometry);
    if (existing) return existing;
    const record = toGeometryAssetRecord(mesh.geometry, mesh.name || 'Imported Geometry');
    assets.push(record);
    geometryIds.set(mesh.geometry, record.id);
    return record.id;
  };

  const objects = buildSceneObjectTree(gltf.scene, stripExtension(filename), { resolveMaterial, resolveGeometry });
  return { objects, materials, assets };
}

/** Best-effort PBR->MaterialDefinition mapping via duck-typing, so non-PBR materials (e.g.
 * MeshBasicMaterial from KHR_materials_unlit) degrade to sane custom defaults instead of
 * throwing. `preset` is always 'custom' — never a fabricated preset name. */
function mapGltfMaterial(mat: THREE.Material, name: string): MaterialDefinition {
  const anyMat = mat as unknown as {
    color?: THREE.Color; metalness?: number; roughness?: number; opacity?: number; transparent?: boolean;
    emissive?: THREE.Color; emissiveIntensity?: number;
  };
  return defaultCustomMaterial(name, {
    color: anyMat.color ? `#${anyMat.color.getHexString()}` : undefined,
    metalness: typeof anyMat.metalness === 'number' ? anyMat.metalness : undefined,
    roughness: typeof anyMat.roughness === 'number' ? anyMat.roughness : undefined,
    opacity: typeof anyMat.opacity === 'number' ? anyMat.opacity : undefined,
    transparent: typeof anyMat.transparent === 'boolean' ? anyMat.transparent : undefined,
    emissive: anyMat.emissive ? `#${anyMat.emissive.getHexString()}` : undefined,
    emissiveIntensity: typeof anyMat.emissiveIntensity === 'number' ? anyMat.emissiveIntensity : undefined,
  });
}
