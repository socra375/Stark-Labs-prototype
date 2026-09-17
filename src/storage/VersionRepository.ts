import type { IStorageAdapter } from './StorageAdapter';
import type { LiveScene } from './ProjectRepository';
import type { ProjectVersion } from '../core/types';
import type { EventBus } from '../core/EventBus';
import { Serializer } from './Serializer';
import { generateId } from '../utils/ids';

export class VersionRepository {
  constructor(private db: IStorageAdapter, private bus?: EventBus) {}

  async create(scene: LiveScene, name: string): Promise<ProjectVersion> {
    const projectId = scene.state.currentProject.get()?.id;
    if (!projectId) throw new Error('No current project to version');
    const version: ProjectVersion = {
      id: generateId('ver'),
      projectId,
      name,
      createdAt: new Date().toISOString(),
      snapshot: Serializer.capture(scene.objects, scene.materials, scene.assembly, scene.assets),
    };
    await this.db.saveVersion(version);
    this.bus?.emit('version:created', { versionId: version.id });
    return version;
  }

  async list(projectId: string): Promise<ProjectVersion[]> {
    return this.db.listVersions(projectId);
  }

  async restore(scene: LiveScene, version: ProjectVersion): Promise<void> {
    Serializer.apply(scene.objects, scene.materials, scene.assembly, scene.assets, version.snapshot);
    scene.state.dirty.set(true);
    this.bus?.emit('version:restored', { versionId: version.id });
  }

  async remove(versionId: string): Promise<void> {
    await this.db.deleteVersion(versionId);
  }
}
