import type { ObjectManager } from '../../core/ObjectManager';
import type { SceneObject } from '../../core/types';
import type { Command } from './Command';

/** Removes an object and its descendants (cascade), keeping snapshots to restore on undo. */
export class DeleteObjectCommand implements Command {
  private snapshots: SceneObject[] = [];

  constructor(private objects: ObjectManager, private objectId: string) {
    const root = objects.getOrThrow(objectId);
    this.snapshots = [structuredClone(root), ...objects.getDescendants(objectId).map((o) => structuredClone(o))];
  }

  execute(): void {
    this.objects.remove(this.objectId, true);
  }

  undo(): void {
    for (const snap of this.snapshots) this.objects.insert(structuredClone(snap));
  }

  describe(): string {
    return `Deleted ${this.snapshots[0]?.name ?? this.objectId}`;
  }
}
