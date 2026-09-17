import type { ObjectManager } from '../../core/ObjectManager';
import type { MaterialManager } from '../../3d/MaterialManager';
import type { AssetManager } from '../../3d/AssetManager';
import type { SceneObject, MaterialDefinition, AssetRecord } from '../../core/types';
import type { Command } from './Command';

export interface ReconstructionCommitPayload {
  sourceImageAsset: AssetRecord;
  geometryAsset: AssetRecord;
  material: MaterialDefinition;
  object: SceneObject;
}

/** Owns the full lifecycle of a committed Image->3D reconstruction: the source image (kept for
 * provenance), the generated geometry asset, its material, and the resulting SceneObject all
 * insert together on execute() and remove together on undo() — identical shape to ImportCommand,
 * since a committed reconstruction becomes a fully normal, editable SceneObject (transform,
 * material, undo/redo, save/export, join/separate/mirror, future geometry-edit compatible). */
export class ReconstructionCommitCommand implements Command {
  constructor(
    private objects: ObjectManager,
    private materials: MaterialManager,
    private assets: AssetManager,
    private payload: ReconstructionCommitPayload,
  ) {}

  execute(): void {
    this.assets.insert(structuredClone(this.payload.sourceImageAsset));
    this.assets.insert(structuredClone(this.payload.geometryAsset));
    this.materials.insert(structuredClone(this.payload.material));
    this.objects.insert(structuredClone(this.payload.object));
  }

  undo(): void {
    this.objects.remove(this.payload.object.id, false);
    this.materials.remove(this.payload.material.id);
    this.assets.remove(this.payload.geometryAsset.id);
    this.assets.remove(this.payload.sourceImageAsset.id);
  }

  describe(): string {
    return `Created estimated reconstruction from ${this.payload.sourceImageAsset.name}`;
  }
}
