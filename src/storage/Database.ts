import Dexie, { type Table } from 'dexie';
import type { SceneObject, MaterialDefinition, Connection, ProjectMeta, ProjectVersion, HistoryLogEntry } from '../core/types';
import type { IStorageAdapter, StoredComponent, StoredMaterial, StoredAssembly } from './StorageAdapter';

/** Dexie/IndexedDB implementation of IStorageAdapter — the app's primary local storage. */
export class Database extends Dexie implements IStorageAdapter {
  projects!: Table<ProjectMeta, string>;
  components!: Table<StoredComponent, string>;
  materials!: Table<StoredMaterial, string>;
  assemblies!: Table<StoredAssembly, string>;
  versions!: Table<ProjectVersion, string>;
  history!: Table<HistoryLogEntry, string>;

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
  }

  async saveProject(meta: ProjectMeta, components: SceneObject[], materials: MaterialDefinition[], assemblies: Connection[]): Promise<void> {
    await this.transaction('rw', this.projects, this.components, this.materials, this.assemblies, async () => {
      await this.projects.put(meta);
      await this.components.where('projectId').equals(meta.id).delete();
      await this.materials.where('projectId').equals(meta.id).delete();
      await this.assemblies.where('projectId').equals(meta.id).delete();
      await this.components.bulkPut(components.map((c) => ({ ...c, projectId: meta.id })));
      await this.materials.bulkPut(materials.map((m) => ({ ...m, projectId: meta.id })));
      await this.assemblies.bulkPut(assemblies.map((a) => ({ ...a, projectId: meta.id })));
    });
  }

  async loadProject(projectId: string) {
    const meta = await this.projects.get(projectId);
    if (!meta) return null;
    const [components, materials, assemblies] = await Promise.all([
      this.components.where('projectId').equals(projectId).toArray(),
      this.materials.where('projectId').equals(projectId).toArray(),
      this.assemblies.where('projectId').equals(projectId).toArray(),
    ]);
    return { meta, components, materials, assemblies };
  }

  async listProjects(): Promise<ProjectMeta[]> {
    return this.projects.orderBy('updatedAt').reverse().toArray();
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.transaction('rw', [this.projects, this.components, this.materials, this.assemblies, this.versions, this.history], async () => {
      await this.projects.delete(projectId);
      await this.components.where('projectId').equals(projectId).delete();
      await this.materials.where('projectId').equals(projectId).delete();
      await this.assemblies.where('projectId').equals(projectId).delete();
      await this.versions.where('projectId').equals(projectId).delete();
      await this.history.where('projectId').equals(projectId).delete();
    });
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
}
