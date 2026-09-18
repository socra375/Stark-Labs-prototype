import type { IStorageAdapter } from './StorageAdapter';
import type { SavedModel } from '../core/types';

/** Thin wrapper over IStorageAdapter's Library methods, matching the existing
 * ProjectRepository/VersionRepository/HistoryRepository pattern — a library entry isn't part of
 * the live scene graph, it's fetched on demand rather than kept as a live in-memory manager. */
export class ModelLibraryRepository {
  constructor(private db: IStorageAdapter) {}

  async save(model: SavedModel): Promise<void> {
    await this.db.saveModel(model);
  }

  async list(kind?: 'model' | 'part'): Promise<SavedModel[]> {
    return this.db.listModels(kind);
  }

  async get(id: string): Promise<SavedModel | null> {
    return this.db.getModel(id);
  }

  async remove(id: string): Promise<void> {
    await this.db.deleteModel(id);
  }
}
