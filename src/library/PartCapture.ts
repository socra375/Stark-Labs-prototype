import type { ObjectManager } from '../core/ObjectManager';
import type { MaterialManager } from '../3d/MaterialManager';
import type { AssemblyManager } from '../editor/AssemblyManager';
import type { AssetManager } from '../3d/AssetManager';
import type { SceneObject, SavedModel } from '../core/types';

/**
 * Captures only what a selected subtree actually uses — unlike "Save as Model" (which snapshots
 * the whole scene via Serializer.capture()), a Part must be self-contained without silently
 * dragging in unrelated materials/assets/connections from the rest of the project. Each selected
 * root's parentId is cleared (it won't exist in whatever project the part is later inserted
 * into) — remapSavedModelForInsertion's existing null-safe parentId remap handles the rest.
 */
export function capturePartSnapshot(
  objects: ObjectManager,
  materials: MaterialManager,
  assembly: AssemblyManager,
  assets: AssetManager,
  rootIds: string[],
): SavedModel['snapshot'] {
  const seen = new Set<string>();
  const components: SceneObject[] = [];
  for (const rootId of rootIds) {
    if (seen.has(rootId)) continue;
    const root = structuredClone(objects.getOrThrow(rootId));
    root.parentId = null;
    seen.add(root.id);
    components.push(root);
    for (const descendant of objects.getDescendants(rootId)) {
      if (seen.has(descendant.id)) continue;
      seen.add(descendant.id);
      components.push(structuredClone(descendant));
    }
  }

  const materialIds = new Set(components.map((c) => c.material).filter((id): id is string => !!id));
  const usedMaterials = [...materialIds].map((id) => materials.get(id)).filter((m): m is NonNullable<typeof m> => !!m);

  const assetIds = new Set(components.map((c) => c.geometry?.assetId).filter((id): id is string => !!id));
  const usedAssets = [...assetIds].map((id) => assets.get(id)).filter((a): a is NonNullable<typeof a> => !!a);

  const componentIds = new Set(components.map((c) => c.id));
  const usedConnections = assembly.getAll().filter((c) => componentIds.has(c.parentObjectId) && componentIds.has(c.childObjectId));

  return { components, materials: usedMaterials, assemblies: usedConnections, assets: usedAssets };
}
