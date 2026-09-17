import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import type { SceneObject } from '../../core/types';
import type { ImportResult } from './ModelImporter';
import { toGeometryAssetRecord, defaultCustomMaterial, stripExtension } from './ImportShared';
import { generateId } from '../../utils/ids';

const loader = new STLLoader();

/** STL has no hierarchy or names at all — just one BufferGeometry. No tree walk needed; this
 * builds the single root SceneObject/AssetRecord/MaterialDefinition directly, named after the
 * source file (the only name STL ever carries), with the same default 'custom' material as OBJ. */
export function importStl(buf: ArrayBuffer, filename: string): ImportResult {
  const geometry = loader.parse(buf);
  const baseName = stripExtension(filename);
  const asset = toGeometryAssetRecord(geometry, baseName);
  const material = defaultCustomMaterial(baseName);

  const object: SceneObject = {
    id: generateId('mesh'),
    name: baseName,
    type: 'mesh',
    geometry: { type: 'imported', params: {}, assetId: asset.id },
    material: material.id,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    parentId: null,
    children: [],
    visible: true,
    locked: false,
    metadata: { origin: 'import' },
  };

  return { objects: [object], materials: [material], assets: [asset] };
}
