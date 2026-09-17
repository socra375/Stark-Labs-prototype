import type { ObjectManager } from '../../core/ObjectManager';
import type { Vec3 } from '../../core/types';
import type { Command } from './Command';

export interface TransformDelta {
  objectId: string;
  before: { position: Vec3; rotation: Vec3; scale: Vec3 };
  after: { position: Vec3; rotation: Vec3; scale: Vec3 };
}

/** Applies/reverts a batch of local-transform changes (single-object gizmo drag or multi-select group transform). */
export class TransformCommand implements Command {
  constructor(private objects: ObjectManager, private deltas: TransformDelta[], private label: string) {}

  execute(): void {
    for (const d of this.deltas) this.objects.update(d.objectId, { ...d.after });
  }

  undo(): void {
    for (const d of this.deltas) this.objects.update(d.objectId, { ...d.before });
  }

  describe(): string {
    return this.label;
  }
}
