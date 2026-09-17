import type { EventBus } from '../core/EventBus';
import type { Command } from './commands/Command';
import type { HistoryLogEntry } from '../core/types';
import { generateId } from '../utils/ids';

const MAX_STACK = 200;
const MAX_LOG = 300;

/** Command-pattern undo/redo stack plus a bounded, human-readable activity log. */
export class HistoryManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private log: HistoryLogEntry[] = [];

  constructor(private bus: EventBus, private projectId: () => string) {}

  execute(command: Command): void {
    command.execute();
    this.record(command);
  }

  /** Tracks a command that has already been applied live (e.g. a gizmo drag) without re-running execute(). */
  record(command: Command): void {
    this.undoStack.push(command);
    if (this.undoStack.length > MAX_STACK) this.undoStack.shift();
    this.redoStack = [];
    this.appendLog(command.describe());
    this.bus.emit('history:changed', {});
  }

  undo(): void {
    const command = this.undoStack.pop();
    if (!command) return;
    command.undo();
    this.redoStack.push(command);
    this.appendLog(`Undo: ${command.describe()}`);
    this.bus.emit('history:changed', {});
  }

  redo(): void {
    const command = this.redoStack.pop();
    if (!command) return;
    command.execute();
    this.undoStack.push(command);
    this.appendLog(`Redo: ${command.describe()}`);
    this.bus.emit('history:changed', {});
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getLog(): HistoryLogEntry[] {
    return [...this.log];
  }

  loadLog(entries: HistoryLogEntry[]): void {
    this.log = entries.slice(-MAX_LOG);
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.bus.emit('history:changed', {});
  }

  private appendLog(description: string): void {
    this.log.push({
      id: generateId('log'),
      projectId: this.projectId(),
      timestamp: new Date().toISOString(),
      description,
    });
    if (this.log.length > MAX_LOG) this.log.shift();
  }
}
