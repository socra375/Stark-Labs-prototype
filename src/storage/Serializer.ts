import type { SceneObject, MaterialDefinition, Connection, AssetRecord, ReferenceImage } from '../core/types';
import type { ObjectManager } from '../core/ObjectManager';
import type { MaterialManager } from '../3d/MaterialManager';
import type { AssemblyManager } from '../editor/AssemblyManager';
import type { AssetManager } from '../3d/AssetManager';
import type { ReferenceImageManager } from '../editor/ReferenceImageManager';

export interface SceneSnapshot {
  components: SceneObject[];
  materials: MaterialDefinition[];
  assemblies: Connection[];
  assets: AssetRecord[];
  referenceImages: ReferenceImage[];
}

/** Captures/applies the live scene (ObjectManager + MaterialManager + AssemblyManager +
 * AssetManager + ReferenceImageManager) as plain JSON. */
export const Serializer = {
  capture(objects: ObjectManager, materials: MaterialManager, assembly: AssemblyManager, assets: AssetManager, referenceImages: ReferenceImageManager): SceneSnapshot {
    return {
      components: objects.serialize(),
      materials: materials.serialize(),
      assemblies: assembly.serialize(),
      assets: assets.serialize(),
      referenceImages: referenceImages.serialize(),
    };
  },

  apply(objects: ObjectManager, materials: MaterialManager, assembly: AssemblyManager, assets: AssetManager, referenceImages: ReferenceImageManager, snapshot: SceneSnapshot): void {
    materials.loadAll(snapshot.materials);
    assets.loadAll(snapshot.assets ?? []);
    // Must load before objects.loadAll(), which fires 'scene:loaded' — ReferenceImageVisualizer's
    // rebuildAll() reads referenceImages.getAll() off that same event.
    referenceImages.loadAll(snapshot.referenceImages ?? []);
    objects.loadAll(snapshot.components);
    assembly.loadAll(snapshot.assemblies);
  },
};
