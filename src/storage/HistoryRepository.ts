import type { IStorageAdapter } from './StorageAdapter';
import type { HistoryLogEntry } from '../core/types';

export class HistoryRepository {
  constructor(private db: IStorageAdapter) {}

  async append(entries: HistoryLogEntry[]): Promise<void> {
    if (entries.length) await this.db.appendHistory(entries);
  }

  async load(projectId: string): Promise<HistoryLogEntry[]> {
    return this.db.loadHistory(projectId);
  }
}
