import * as THREE from 'three';
import type { SceneObject, SceneObjectType, AssetRecord, MaterialDefinition } from '../../core/types';
import { decomposeMatrix } from '../TransformMath';
import { generateId } from '../../utils/ids';

export interface TreeResolvers {
  /** Returns the MaterialDefinition id a mesh's material should reference, or undefined for the mesh-factory default. */
  resolveMaterial(mesh: THREE.Mesh): string | undefined;
  /** Returns the AssetRecord id a mesh's geometry should reference (inserting a new one on first sight of a given geometry). */
  resolveGeometry(mesh: THREE.Mesh): string;
}

/**
 * Walks a loaded THREE.Object3D tree into a flat SceneObject[] (parents before children),
 * mirroring templates/builder.ts's buildTree() idiom exactly: push a node before recursing,
 * back-fill `children` from the recursive result. Every node's local transform is decomposed
 * via the project's one sanctioned TransformMath.decomposeMatrix() — never hand-rolled.
 *
 * Non-Mesh/non-Group children (lights, cameras, bones) are skipped, not silently mismapped.
 * If `root` has exactly one childless child, that child is promoted straight to a root-level
 * object instead of wrapping it in a pointless single-child group — this is what keeps STL/a
 * one-object OBJ/a trivial single-mesh glTF each producing one clean root mesh.
 */
export function buildSceneObjectTree(root: THREE.Object3D, rootName: string, resolvers: TreeResolvers): SceneObject[] {
  const relevantChildren = root.children.filter((c) => c instanceof THREE.Mesh || c instanceof THREE.Group);
  if (relevantChildren.length === 1 && relevantChildren[0].children.filter((c) => c instanceof THREE.Mesh || c instanceof THREE.Group).length === 0) {
    return walk(relevantChildren[0], rootName, null, resolvers);
  }
  const wrapperId = generateId('grp');
  const wrapper: SceneObject = {
    id: wrapperId,
    name: rootName,
    type: 'group',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    parentId: null,
    children: [],
    visible: true,
    locked: false,
    metadata: { origin: 'import' },
  };
  const result: SceneObject[] = [wrapper];
  for (const child of relevantChildren) {
    const childObjs = walk(child, child.name || rootName, wrapperId, resolvers);
    wrapper.children.push(childObjs[0].id);
    result.push(...childObjs);
  }
  return result;
}

function walk(node: THREE.Object3D, fallbackName: string, parentId: string | null, resolvers: TreeResolvers): SceneObject[] {
  node.updateMatrix();
  const { position, rotation, scale } = decomposeMatrix(node.matrix);
  const isMesh = node instanceof THREE.Mesh;
  const type: SceneObjectType = isMesh ? 'mesh' : 'group';
  const id = generateId(isMesh ? 'mesh' : 'grp');

  const obj: SceneObject = {
    id,
    name: node.name || fallbackName,
    type,
    geometry: isMesh ? { type: 'imported', params: {}, assetId: resolvers.resolveGeometry(node) } : undefined,
    material: isMesh ? resolvers.resolveMaterial(node) : undefined,
    position,
    rotation,
    scale,
    parentId,
    children: [],
    visible: true,
    locked: false,
    metadata: { origin: 'import' },
  };

  const result: SceneObject[] = [obj];
  const relevantChildren = node.children.filter((c) => c instanceof THREE.Mesh || c instanceof THREE.Group);
  for (const child of relevantChildren) {
    const childObjs = walk(child, child.name || `${obj.name} part`, id, resolvers);
    obj.children.push(childObjs[0].id);
    result.push(...childObjs);
  }
  return result;
}

/** Pure literal builder — mirrors AssetManager.insertGeometry()'s normalization (a plain
 * BufferGeometry copy before serializing, so a still-parametric geometry never breaks
 * BufferGeometryLoader.parse() on read-back) but with a caller-assigned id and no live-manager
 * mutation, since adapters run before any Command exists (see ImportCommand for why). */
export function toGeometryAssetRecord(geometry: THREE.BufferGeometry, name: string): AssetRecord {
  const plain = new THREE.BufferGeometry().copy(geometry);
  return {
    id: generateId('asset'),
    kind: 'geometry',
    mimeType: 'application/json',
    name,
    data: JSON.stringify(plain.toJSON()),
    createdAt: new Date().toISOString(),
  };
}

/** Pure literal builder matching MaterialManager.createCustom()'s defaults — never a fabricated preset name. */
export function defaultCustomMaterial(name: string, overrides: Partial<MaterialDefinition> = {}): MaterialDefinition {
  return {
    id: generateId('mat'),
    name,
    preset: 'custom',
    color: overrides.color ?? '#8899aa',
    metalness: overrides.metalness ?? 0.5,
    roughness: overrides.roughness ?? 0.5,
    opacity: overrides.opacity ?? 1,
    transparent: overrides.transparent ?? false,
    emissive: overrides.emissive ?? '#000000',
    emissiveIntensity: overrides.emissiveIntensity ?? 0,
  };
}

export function stripExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx > 0 ? filename.slice(0, idx) : filename;
}
