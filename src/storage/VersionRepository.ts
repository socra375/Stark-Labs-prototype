import type { IStorageAdapter } from './StorageAdapter';
import type { LiveScene } from './ProjectRepository';
import type { ProjectVersion } from '../core/types';
import { Serializer } from './Serializer';
import { generateId } from '../utils/ids';

export class VersionRepository {
  constructor(private db: IStorageAdapter) {}

  async create(scene: LiveScene, name: string): Promise<ProjectVersion> {
    const projectId = scene.state.currentProject.get()?.id;
    if (!projectId) throw new Error('No current project to version');
    const version: ProjectVersion = {
      id: generateId('ver'),
      projectId,
      name,
      createdAt: new Date().toISOString(),
      snapshot: Serializer.capture(scene.objects, scene.materials, scene.assembly),
    };
    await this.db.saveVersion(version);
    return version;
  }

  async list(projectId: string): Promise<ProjectVersion[]> {
    return this.db.listVersions(projectId);
  }

  async restore(scene: LiveScene, version: ProjectVersion): Promise<void> {
    Serializer.apply(scene.objects, scene.materials, scene.assembly, version.snapshot);
    scene.state.dirty.set(true);
  }

  async remove(versionId: string): Promise<void> {
    await this.db.deleteVersion(versionId);
  }
}
