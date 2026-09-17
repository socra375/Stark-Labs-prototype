import type { ObjectManager } from '../../core/ObjectManager';
import type { SceneObject } from '../../core/types';
import type { Command } from './Command';

/** Inserts one or more fully-formed SceneObjects (parents before children). Reused by Duplicate/Mirror. */
export class CreateObjectCommand implements Command {
  constructor(private objects: ObjectManager, private snapshots: SceneObject[], private label?: string) {}

  execute(): void {
    for (const snap of this.snapshots) this.objects.insert(structuredClone(snap));
  }

  undo(): void {
    for (const snap of [...this.snapshots].reverse()) this.objects.remove(snap.id, false);
  }

  describe(): string {
    if (this.label) return this.label;
    return this.snapshots.length === 1 ? `Created ${this.snapshots[0].name}` : `Created ${this.snapshots.length} objects`;
  }
}
