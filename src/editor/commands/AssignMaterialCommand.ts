import type { ObjectManager } from '../../core/ObjectManager';
import type { Command } from './Command';

/** Changes which MaterialDefinition a SceneObject references. */
export class AssignMaterialCommand implements Command {
  private before: string | undefined;

  constructor(private objects: ObjectManager, private objectId: string, private materialId: string) {
    this.before = objects.getOrThrow(objectId).material;
  }

  execute(): void {
    this.objects.update(this.objectId, { material: this.materialId });
  }

  undo(): void {
    this.objects.update(this.objectId, { material: this.before });
  }

  describe(): string {
    return `Changed material on ${this.objects.get(this.objectId)?.name ?? this.objectId}`;
  }
}
