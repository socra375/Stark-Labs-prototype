import type { SceneObject, MaterialDefinition, Connection } from '../core/types';
import type { ObjectManager } from '../core/ObjectManager';
import type { MaterialManager } from '../3d/MaterialManager';
import type { AssemblyManager } from '../editor/AssemblyManager';

export interface SceneSnapshot {
  components: SceneObject[];
  materials: MaterialDefinition[];
  assemblies: Connection[];
}

/** Captures/applies the live scene (ObjectManager + MaterialManager + AssemblyManager) as plain JSON. */
export const Serializer = {
  capture(objects: ObjectManager, materials: MaterialManager, assembly: AssemblyManager): SceneSnapshot {
    return {
      components: objects.serialize(),
      materials: materials.serialize(),
      assemblies: assembly.serialize(),
    };
  },

  apply(objects: ObjectManager, materials: MaterialManager, assembly: AssemblyManager, snapshot: SceneSnapshot): void {
    materials.loadAll(snapshot.materials);
    objects.loadAll(snapshot.components);
    assembly.loadAll(snapshot.assemblies);
  },
};
