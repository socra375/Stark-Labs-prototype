import type { AssemblyManager } from '../AssemblyManager';
import type { Connection } from '../../core/types';
import type { Command } from './Command';

export class DisconnectCommand implements Command {
  private snapshot: Connection;

  constructor(private assembly: AssemblyManager, connectionId: string) {
    this.snapshot = structuredClone(assembly.get(connectionId)!);
  }

  execute(): void {
    this.assembly.disconnect(this.snapshot.id);
  }

  undo(): void {
    this.assembly.insert(structuredClone(this.snapshot));
  }

  describe(): string {
    return `Disconnected ${this.snapshot.parentObjectId} from ${this.snapshot.childObjectId}`;
  }
}
