import type { IStorageAdapter } from './StorageAdapter';
import type { ObjectManager } from '../core/ObjectManager';
import type { MaterialManager } from '../3d/MaterialManager';
import type { AssemblyManager } from '../editor/AssemblyManager';
import type { AssetManager } from '../3d/AssetManager';
import type { AppState } from '../core/AppState';
import type { ProjectMeta } from '../core/types';
import { Serializer } from './Serializer';
import { generateId } from '../utils/ids';

export interface LiveScene {
  objects: ObjectManager;
  materials: MaterialManager;
  assembly: AssemblyManager;
  assets: AssetManager;
  state: AppState;
}

const DEFAULT_SETTINGS = { gridVisible: true, snapEnabled: false, snapStep: 0.25 };

export class ProjectRepository {
  constructor(private db: IStorageAdapter) {}

  createMeta(name: string, description: string, template: string): ProjectMeta {
    const now = new Date().toISOString();
    return { id: generateId('proj'), name, description, template, createdAt: now, updatedAt: now, settings: { ...DEFAULT_SETTINGS } };
  }

  async save(scene: LiveScene): Promise<void> {
    const meta = scene.state.currentProject.get();
    if (!meta) throw new Error('No current project to save');
    meta.updatedAt = new Date().toISOString();
    scene.state.currentProject.set({ ...meta });
    const snapshot = Serializer.capture(scene.objects, scene.materials, scene.assembly, scene.assets);
    await this.db.saveProject(meta, snapshot.components, snapshot.materials, snapshot.assemblies, snapshot.assets, snapshot.referenceImages);
    scene.state.dirty.set(false);
  }

  async saveAs(scene: LiveScene, newName: string): Promise<ProjectMeta> {
    const current = scene.state.currentProject.get();
    const meta = this.createMeta(newName, current?.description ?? '', current?.template ?? 'blank');
    scene.state.currentProject.set(meta);
    await this.save(scene);
    return meta;
  }

  async open(scene: LiveScene, projectId: string): Promise<boolean> {
    const record = await this.db.loadProject(projectId);
    if (!record) return false;
    Serializer.apply(scene.objects, scene.materials, scene.assembly, scene.assets, record);
    scene.state.currentProject.set(record.meta);
    scene.state.dirty.set(false);
    return true;
  }

  async duplicate(projectId: string, newName: string): Promise<ProjectMeta | null> {
    const record = await this.db.loadProject(projectId);
    if (!record) return null;
    const meta = this.createMeta(newName, record.meta.description, record.meta.template);
    await this.db.saveProject(meta, record.components, record.materials, record.assemblies, record.assets, record.referenceImages);
    return meta;
  }

  async rename(projectId: string, newName: string): Promise<void> {
    const record = await this.db.loadProject(projectId);
    if (!record) return;
    const meta = { ...record.meta, name: newName, updatedAt: new Date().toISOString() };
    await this.db.saveProject(meta, record.components, record.materials, record.assemblies, record.assets, record.referenceImages);
  }

  async remove(projectId: string): Promise<void> {
    await this.db.deleteProject(projectId);
  }

  async list(): Promise<ProjectMeta[]> {
    return this.db.listProjects();
  }
}
