import type { SceneObject, MaterialDefinition, Connection, ProjectMeta, ProjectVersion, HistoryLogEntry } from '../core/types';

export interface StoredComponent extends SceneObject { projectId: string }
export interface StoredMaterial extends MaterialDefinition { projectId: string }
export interface StoredAssembly extends Connection { projectId: string }

/**
 * Storage seam: everything the app persists goes through this interface. `Database`
 * (Dexie/IndexedDB) is the only implementation today; swapping in a remote backend later
 * means writing a new IStorageAdapter, not touching ProjectRepository/VersionRepository or
 * any caller above them.
 */
export interface IStorageAdapter {
  saveProject(meta: ProjectMeta, components: SceneObject[], materials: MaterialDefinition[], assemblies: Connection[]): Promise<void>;
  loadProject(projectId: string): Promise<{ meta: ProjectMeta; components: SceneObject[]; materials: MaterialDefinition[]; assemblies: Connection[] } | null>;
  listProjects(): Promise<ProjectMeta[]>;
  deleteProject(projectId: string): Promise<void>;

  saveVersion(version: ProjectVersion): Promise<void>;
  listVersions(projectId: string): Promise<ProjectVersion[]>;
  deleteVersion(versionId: string): Promise<void>;

  appendHistory(entries: HistoryLogEntry[]): Promise<void>;
  loadHistory(projectId: string): Promise<HistoryLogEntry[]>;
}
