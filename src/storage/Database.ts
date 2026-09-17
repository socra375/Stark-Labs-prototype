import Dexie, { type Table } from 'dexie';
import type { SceneObject, MaterialDefinition, Connection, ProjectMeta, ProjectVersion, HistoryLogEntry, AssetRecord, ReferenceImage, SavedModel } from '../core/types';
import type { IStorageAdapter, StoredComponent, StoredMaterial, StoredAssembly, StoredAsset, StoredReferenceImage, LoadedProject } from './StorageAdapter';

/** Dexie/IndexedDB implementation of IStorageAdapter — the app's primary local storage. */
export class Database extends Dexie implements IStorageAdapter {
  projects!: Table<ProjectMeta, string>;
  components!: Table<StoredComponent, string>;
  materials!: Table<StoredMaterial, string>;
  assemblies!: Table<StoredAssembly, string>;
  versions!: Table<ProjectVersion, string>;
  history!: Table<HistoryLogEntry, string>;
  assets!: Table<StoredAsset, string>;
  referenceImages!: Table<StoredReferenceImage, string>;
  models!: Table<SavedModel, string>;

  constructor() {
    super('stark-prototype-lab');
    this.version(1).stores({
      projects: 'id, name, updatedAt',
      components: 'id, projectId, parentId',
      materials: 'id, projectId',
      assemblies: 'id, projectId, parentObjectId, childObjectId',
      versions: 'id, projectId, createdAt',
      history: 'id, projectId, timestamp',
    });
    // v2: adds typed Connections + Assets (imported/reconstructed geometry, source images) +
    // reference images (Image->Build mode) + a library table for My Models / My Parts.
    // Additive only — v1 projects still open; assemblies without a `type` are backfilled 'FIXED',
    // the closest honest description of pre-2.0 behavior (no physical distinction existed at all).
    this.version(2)
      .stores({
        projects: 'id, name, updatedAt',
        components: 'id, projectId, parentId',
        materials: 'id, projectId',
        assemblies: 'id, projectId, parentObjectId, childObjectId, type',
        versions: 'id, projectId, createdAt',
        history: 'id, projectId, timestamp',
        assets: 'id, projectId, kind',
        referenceImages: 'id, projectId',
        models: 'id, kind, name, updatedAt',
      })
      .upgrade((tx) =>
        tx
          .table('assemblies')
          .toCollection()
          .modify((a: Partial<Connection>) => {
            if (!a.type) a.type = 'FIXED';
          }),
      );
  }

  async saveProject(
    meta: ProjectMeta,
    components: SceneObject[],
    materials: MaterialDefinition[],
    assemblies: Connection[],
    assets: AssetRecord[],
    referenceImages: ReferenceImage[],
  ): Promise<void> {
    await this.transaction('rw', [this.projects, this.components, this.materials, this.assemblies, this.assets, this.referenceImages], async () => {
      await this.projects.put(meta);
      await this.components.where('projectId').equals(meta.id).delete();
      await this.materials.where('projectId').equals(meta.id).delete();
      await this.assemblies.where('projectId').equals(meta.id).delete();
      await this.assets.where('projectId').equals(meta.id).delete();
      await this.referenceImages.where('projectId').equals(meta.id).delete();
      await this.components.bulkPut(components.map((c) => ({ ...c, projectId: meta.id })));
      await this.materials.bulkPut(materials.map((m) => ({ ...m, projectId: meta.id })));
      await this.assemblies.bulkPut(assemblies.map((a) => ({ ...a, projectId: meta.id })));
      await this.assets.bulkPut(assets.map((a) => ({ ...a, projectId: meta.id })));
      await this.referenceImages.bulkPut(referenceImages.map((r) => ({ ...r, projectId: meta.id })));
    });
  }

  async loadProject(projectId: string): Promise<LoadedProject | null> {
    const meta = await this.projects.get(projectId);
    if (!meta) return null;
    const [components, materials, assemblies, assets, referenceImages] = await Promise.all([
      this.components.where('projectId').equals(projectId).toArray(),
      this.materials.where('projectId').equals(projectId).toArray(),
      this.assemblies.where('projectId').equals(projectId).toArray(),
      this.assets.where('projectId').equals(projectId).toArray(),
      this.referenceImages.where('projectId').equals(projectId).toArray(),
    ]);
    return { meta, components, materials, assemblies, assets, referenceImages };
  }

  async listProjects(): Promise<ProjectMeta[]> {
    return this.projects.orderBy('updatedAt').reverse().toArray();
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.transaction(
      'rw',
      [this.projects, this.components, this.materials, this.assemblies, this.versions, this.history, this.assets, this.referenceImages],
      async () => {
        await this.projects.delete(projectId);
        await this.components.where('projectId').equals(projectId).delete();
        await this.materials.where('projectId').equals(projectId).delete();
        await this.assemblies.where('projectId').equals(projectId).delete();
        await this.versions.where('projectId').equals(projectId).delete();
        await this.history.where('projectId').equals(projectId).delete();
        await this.assets.where('projectId').equals(projectId).delete();
        await this.referenceImages.where('projectId').equals(projectId).delete();
      },
    );
  }

  async saveVersion(version: ProjectVersion): Promise<void> {
    await this.versions.put(version);
  }

  async listVersions(projectId: string): Promise<ProjectVersion[]> {
    return this.versions.where('projectId').equals(projectId).reverse().sortBy('createdAt');
  }

  async deleteVersion(versionId: string): Promise<void> {
    await this.versions.delete(versionId);
  }

  async appendHistory(entries: HistoryLogEntry[]): Promise<void> {
    await this.history.bulkPut(entries);
  }

  async loadHistory(projectId: string): Promise<HistoryLogEntry[]> {
    return this.history.where('projectId').equals(projectId).sortBy('timestamp');
  }

  async saveModel(model: SavedModel): Promise<void> {
    await this.models.put(model);
  }

  async listModels(kind?: 'model' | 'part'): Promise<SavedModel[]> {
    const all = await this.models.orderBy('updatedAt').reverse().toArray();
    return kind ? all.filter((m) => m.kind === kind) : all;
  }

  async getModel(id: string): Promise<SavedModel | null> {
    return (await this.models.get(id)) ?? null;
  }

  async deleteModel(id: string): Promise<void> {
    await this.models.delete(id);
  }
}
