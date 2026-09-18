import type { SceneObject, MaterialDefinition, Connection, ProjectMeta, ProjectVersion, HistoryLogEntry, AssetRecord, ReferenceImage, SavedModel } from '../core/types';

export interface StoredComponent extends SceneObject { projectId: string }
export interface StoredMaterial extends MaterialDefinition { projectId: string }
export interface StoredAssembly extends Connection { projectId: string }
export interface StoredAsset extends AssetRecord { projectId: string }
export interface StoredReferenceImage extends ReferenceImage { projectId: string }

export interface LoadedProject {
  meta: ProjectMeta;
  components: SceneObject[];
  materials: MaterialDefinition[];
  assemblies: Connection[];
  assets: AssetRecord[];
  referenceImages: ReferenceImage[];
}

/**
 * Storage seam: everything the app persists goes through this interface. `Database`
 * (Dexie/IndexedDB) is the only implementation today; swapping in a remote backend later
 * means writing a new IStorageAdapter, not touching ProjectRepository/VersionRepository or
 * any caller above them.
 */
export interface IStorageAdapter {
  saveProject(
    meta: ProjectMeta,
    components: SceneObject[],
    materials: MaterialDefinition[],
    assemblies: Connection[],
    assets: AssetRecord[],
    referenceImages: ReferenceImage[],
  ): Promise<void>;
  loadProject(projectId: string): Promise<LoadedProject | null>;
  listProjects(): Promise<ProjectMeta[]>;
  deleteProject(projectId: string): Promise<void>;

  saveVersion(version: ProjectVersion): Promise<void>;
  listVersions(projectId: string): Promise<ProjectVersion[]>;
  deleteVersion(versionId: string): Promise<void>;

  appendHistory(entries: HistoryLogEntry[]): Promise<void>;
  loadHistory(projectId: string): Promise<HistoryLogEntry[]>;

  // Library (My Models / My Parts) — independent of any "current project".
  saveModel(model: SavedModel): Promise<void>;
  listModels(kind?: 'model' | 'part'): Promise<SavedModel[]>;
  getModel(id: string): Promise<SavedModel | null>;
  deleteModel(id: string): Promise<void>;
}
