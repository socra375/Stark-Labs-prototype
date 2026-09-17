import type { AssemblyManager } from '../AssemblyManager';
import type { Connection } from '../../core/types';
import type { Command } from './Command';

export class ConnectCommand implements Command {
  constructor(private assembly: AssemblyManager, private connection: Connection) {}

  execute(): void {
    this.assembly.insert(structuredClone(this.connection));
  }

  undo(): void {
    this.assembly.disconnect(this.connection.id);
  }

  describe(): string {
    return `Connected ${this.connection.parentObjectId} to ${this.connection.childObjectId}`;
  }
}
