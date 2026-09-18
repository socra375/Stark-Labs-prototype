import type { SavedModel, SceneObject, MaterialDefinition, AssetRecord, Connection } from '../core/types';
import { generateId } from '../utils/ids';

export interface InsertLibraryItemPayload {
  assets: AssetRecord[];
  materials: MaterialDefinition[];
  components: SceneObject[]; // parents before children
  connections: Connection[];
  sourceName: string;
}

/**
 * Pure remapping: every asset/material/component/connection in a SavedModel gets a fresh id and
 * a deep clone, so an insertion (or a re-insertion of the same saved model) never shares a live
 * mutable instance with the saved entry or any other insertion — the addendum's explicit
 * requirement. Generalizes DuplicateCommand's single-subtree id-remapping idiom to a
 * potentially multi-root snapshot.
 */
export function remapSavedModelForInsertion(model: SavedModel): InsertLibraryItemPayload {
  const assetIdMap = new Map<string, string>();
  const assets = model.snapshot.assets.map((a) => {
    const id = generateId('asset');
    assetIdMap.set(a.id, id);
    return { ...structuredClone(a), id };
  });

  const materialIdMap = new Map<string, string>();
  const materials = model.snapshot.materials.map((m) => {
    const id = generateId('mat');
    materialIdMap.set(m.id, id);
    return { ...structuredClone(m), id };
  });

  const componentIdMap = new Map<string, string>();
  for (const c of model.snapshot.components) componentIdMap.set(c.id, generateId(c.type === 'group' ? 'grp' : 'mesh'));
  const components = model.snapshot.components.map((c) => {
    const clone = structuredClone(c);
    clone.id = componentIdMap.get(c.id)!;
    clone.parentId = c.parentId ? (componentIdMap.get(c.parentId) ?? null) : null;
    clone.children = c.children.map((ch) => componentIdMap.get(ch)!).filter((id): id is string => !!id);
    clone.material = c.material ? materialIdMap.get(c.material) : undefined;
    if (clone.geometry?.assetId) clone.geometry.assetId = assetIdMap.get(c.geometry!.assetId!);
    return clone;
  });

  const connections = model.snapshot.assemblies
    .filter((conn) => componentIdMap.has(conn.parentObjectId) && componentIdMap.has(conn.childObjectId))
    .map((conn) => ({
      ...structuredClone(conn),
      id: generateId('conn'),
      parentObjectId: componentIdMap.get(conn.parentObjectId)!,
      childObjectId: componentIdMap.get(conn.childObjectId)!,
    }));

  return { assets, materials, components, connections, sourceName: model.name };
}
