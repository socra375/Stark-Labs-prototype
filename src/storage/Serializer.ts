import type { SceneObject, MaterialDefinition, Connection, AssetRecord, ReferenceImage } from '../core/types';
import type { ObjectManager } from '../core/ObjectManager';
import type { MaterialManager } from '../3d/MaterialManager';
import type { AssemblyManager } from '../editor/AssemblyManager';
import type { AssetManager } from '../3d/AssetManager';

export interface SceneSnapshot {
  components: SceneObject[];
  materials: MaterialDefinition[];
  assemblies: Connection[];
  assets: AssetRecord[];
  referenceImages: ReferenceImage[];
}

/** Captures/applies the live scene (ObjectManager + MaterialManager + AssemblyManager + AssetManager)
 * as plain JSON. ReferenceImages have no live manager yet (that's ReferenceImageManager, M17) — until
 * then there's nothing that can create one, so capture() always emits [] and apply() ignores the field
 * honestly rather than pretending to restore data that was never real. */
export const Serializer = {
  capture(objects: ObjectManager, materials: MaterialManager, assembly: AssemblyManager, assets: AssetManager): SceneSnapshot {
    return {
      components: objects.serialize(),
      materials: materials.serialize(),
      assemblies: assembly.serialize(),
      assets: assets.serialize(),
      referenceImages: [],
    };
  },

  apply(objects: ObjectManager, materials: MaterialManager, assembly: AssemblyManager, assets: AssetManager, snapshot: SceneSnapshot): void {
    materials.loadAll(snapshot.materials);
    assets.loadAll(snapshot.assets ?? []);
    objects.loadAll(snapshot.components);
    assembly.loadAll(snapshot.assemblies);
  },
};
