import type { ObjectManager } from '../../core/ObjectManager';
import type { MaterialManager } from '../../3d/MaterialManager';
import type { AssetManager } from '../../3d/AssetManager';
import type { SceneObject, MaterialDefinition, AssetRecord } from '../../core/types';
import type { Command } from './Command';

export interface ImportPayload {
  objects: SceneObject[]; // flat, parents before children
  materials: MaterialDefinition[];
  assets: AssetRecord[];
  sourceName: string;
}

/** Owns the full lifecycle of an imported model: its AssetRecords, MaterialDefinitions, and
 * SceneObjects all get inserted together on execute() and removed together on undo(). Assets and
 * materials must exist before objects.insert() runs for a mesh, since ObjectManager.insert()
 * fires 'object:created' synchronously, and SceneSync.mount() resolves geometry/material
 * immediately off that same event. */
export class ImportCommand implements Command {
  constructor(
    private objects: ObjectManager,
    private materials: MaterialManager,
    private assets: AssetManager,
    private payload: ImportPayload,
  ) {}

  execute(): void {
    for (const asset of this.payload.assets) this.assets.insert(structuredClone(asset));
    for (const material of this.payload.materials) this.materials.insert(structuredClone(material));
    for (const obj of this.payload.objects) this.objects.insert(structuredClone(obj));
  }

  undo(): void {
    for (const obj of [...this.payload.objects].reverse()) this.objects.remove(obj.id, false);
    for (const material of this.payload.materials) this.materials.remove(material.id);
    for (const asset of this.payload.assets) this.assets.remove(asset.id);
  }

  describe(): string {
    return `Imported ${this.payload.sourceName}`;
  }
}
