import type { SceneObject, MaterialDefinition, AssetRecord } from '../../core/types';
import { importGltf } from './GltfImportAdapter';
import { importObj } from './ObjImportAdapter';
import { importStl } from './StlImportAdapter';

export interface ImportResult {
  objects: SceneObject[]; // flat, parents before children
  materials: MaterialDefinition[];
  assets: AssetRecord[];
}

export type ImportExtension = 'glb' | 'gltf' | 'obj' | 'stl';

export class ImportError extends Error {}

const SUPPORTED_EXTENSIONS: readonly ImportExtension[] = ['glb', 'gltf', 'obj', 'stl'];

export function extensionOf(filename: string): ImportExtension | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext as ImportExtension) ? (ext as ImportExtension) : null;
}

/** Extension-keyed dispatch (same Record<string, Loader> idiom as GeometryFactory's `builders`).
 * Any failure — unsupported extension, malformed file, a loader throwing/rejecting — becomes one
 * honest ImportError naming the file; adapters never return a partial result, so a caller either
 * gets a complete ImportResult or an exception, never a silently-dropped node. */
export async function importModelFile(file: File): Promise<ImportResult> {
  const ext = extensionOf(file.name);
  if (!ext) {
    throw new ImportError(`Unsupported file type "${file.name}". Supported formats: .glb, .gltf, .obj, .stl`);
  }
  const buf = await file.arrayBuffer();
  try {
    switch (ext) {
      case 'glb':
      case 'gltf':
        return await importGltf(buf, file.name);
      case 'obj':
        return importObj(buf, file.name);
      case 'stl':
        return importStl(buf, file.name);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new ImportError(`Failed to import "${file.name}": ${message}`);
  }
}
