import type { ObjectManager } from '../../core/ObjectManager';
import type { AssetManager } from '../../3d/AssetManager';
import type { SeparatePlan } from '../SeparateTool';
import type { Command } from './Command';

/** Single Command handles both real Separate cases (joinedFrom-restore and union-find split) via
 * the same unified plan shape. */
export class SeparateCommand implements Command {
  constructor(private objects: ObjectManager, private assets: AssetManager, private plan: SeparatePlan) {}

  execute(): void {
    for (const a of this.plan.newAssets) this.assets.insert(structuredClone(a));
    for (const obj of this.plan.newObjects) this.objects.insert(structuredClone(obj));
    this.objects.remove(this.plan.targetId, false);
    if (this.plan.targetAssetSnapshot) this.assets.remove(this.plan.targetAssetSnapshot.id);
  }

  undo(): void {
    // Asset must exist before the object is re-inserted: ObjectManager.insert() fires
    // 'object:created' synchronously, and SceneSync.mount() resolves the geometry asset
    // immediately off that same event.
    if (this.plan.targetAssetSnapshot) this.assets.insert(structuredClone(this.plan.targetAssetSnapshot));
    this.objects.insert(structuredClone(this.plan.targetSnapshot));
    for (const obj of this.plan.newObjects) this.objects.remove(obj.id, false);
    for (const a of this.plan.newAssets) this.assets.remove(a.id);
  }

  describe(): string {
    return `Separated ${this.plan.targetSnapshot.name}`;
  }
}
