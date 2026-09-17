import type { ObjectManager } from '../../core/ObjectManager';
import type { Command } from './Command';

export class RenameCommand implements Command {
  private before: string;

  constructor(private objects: ObjectManager, private objectId: string, private after: string) {
    this.before = objects.getOrThrow(objectId).name;
  }

  execute(): void {
    this.objects.update(this.objectId, { name: this.after });
  }

  undo(): void {
    this.objects.update(this.objectId, { name: this.before });
  }

  describe(): string {
    return `Renamed ${this.before} to ${this.after}`;
  }
}
