import type { ObjectManager } from '../../core/ObjectManager';
import type { AssetManager } from '../../3d/AssetManager';
import type { JoinPlan } from '../JoinTool';
import type { Command } from './Command';

/** Deliberately does NOT remove the originals' own geometry AssetRecords (only their
 * SceneObject entries) — they become orphaned-but-present, which is what makes Separate's
 * joinedFrom-restore path trivial: those AssetRecords are still there, ready to be referenced
 * again the moment the original SceneObjects are re-inserted. */
export class JoinCommand implements Command {
  constructor(private objects: ObjectManager, private assets: AssetManager, private plan: JoinPlan) {}

  execute(): void {
    this.assets.insert(structuredClone(this.plan.geometryAsset));
    this.objects.insert(structuredClone(this.plan.mergedObject));
    for (const id of this.plan.originalIds) this.objects.remove(id, false);
  }

  undo(): void {
    for (const original of this.plan.mergedObject.metadata.joinedFrom ?? []) this.objects.insert(structuredClone(original));
    this.objects.remove(this.plan.mergedObject.id, false);
    this.assets.remove(this.plan.geometryAsset.id);
  }

  describe(): string {
    return `Joined ${this.plan.originalIds.length} objects`;
  }
}
