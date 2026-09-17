import type { ObjectManager } from '../../core/ObjectManager';
import type { GroupPlan } from '../GroupingManager';
import type { Command } from './Command';

export class UngroupCommand implements Command {
  constructor(private objects: ObjectManager, private plan: GroupPlan) {}

  execute(): void {
    for (const r of this.plan.reparents) {
      this.objects.reparent(r.objectId, r.newParentId);
      this.objects.update(r.objectId, { ...r.newLocal });
    }
    this.objects.remove(this.plan.group.id, false);
  }

  undo(): void {
    this.objects.insert(structuredClone(this.plan.group));
    for (const r of this.plan.reparents) {
      this.objects.reparent(r.objectId, r.oldParentId);
      this.objects.update(r.objectId, { ...r.oldLocal });
    }
  }

  describe(): string {
    return `Ungrouped ${this.plan.group.name}`;
  }
}
