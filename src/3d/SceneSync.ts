import * as THREE from 'three';
import type { EventBus } from '../core/EventBus';
import type { ObjectManager } from '../core/ObjectManager';
import type { SceneObject } from '../core/types';
import { MeshFactory } from './MeshFactory';
import type { MaterialManager } from './MaterialManager';
import type { AssetManager } from './AssetManager';

/** Two-way sync seam: mirrors the ObjectManager model into live Object3D instances under sceneRoot. */
export class SceneSync {
  private meshFactory: MeshFactory;
  private mounted = new Map<string, THREE.Object3D>();

  constructor(
    private bus: EventBus,
    private objects: ObjectManager,
    materials: MaterialManager,
    private sceneRoot: THREE.Group,
    assets?: AssetManager,
  ) {
    this.meshFactory = new MeshFactory(materials, assets);
    this.bus.on('object:created', ({ object }) => this.mount(object));
    this.bus.on('object:updated', ({ objectId, patch }) => this.applyPatch(objectId, patch));
    this.bus.on('object:removed', ({ objectId }) => this.unmount(objectId));
    this.bus.on('scene:cleared', () => this.unmountAll());
    this.bus.on('scene:loaded', () => this.rebuildAll());
  }

  getObject3D(id: string): THREE.Object3D | undefined {
    return this.mounted.get(id);
  }

  private parentContainer(obj: SceneObject): THREE.Object3D {
    if (!obj.parentId) return this.sceneRoot;
    return this.mounted.get(obj.parentId) ?? this.sceneRoot;
  }

  private mount(obj: SceneObject): void {
    if (this.mounted.has(obj.id)) return;
    const object3D = this.meshFactory.build(obj);
    this.parentContainer(obj).add(object3D);
    this.mounted.set(obj.id, object3D);
  }

  private applyPatch(objectId: string, patch: Partial<SceneObject>): void {
    const object3D = this.mounted.get(objectId);
    const obj = this.objects.get(objectId);
    if (!object3D || !obj) return;

    if ('geometry' in patch) this.meshFactory.updateGeometry(object3D, obj);
    if ('material' in patch) this.meshFactory.updateMaterial(object3D, obj);
    this.meshFactory.applyTransform(object3D, obj);

    if ('parentId' in patch) {
      object3D.removeFromParent();
      this.parentContainer(obj).add(object3D);
    }
  }

  private unmount(objectId: string): void {
    const object3D = this.mounted.get(objectId);
    if (!object3D) return;
    object3D.removeFromParent();
    this.meshFactory.disposeMesh(object3D);
    this.mounted.delete(objectId);
  }

  private unmountAll(): void {
    for (const id of [...this.mounted.keys()]) this.unmount(id);
  }

  private rebuildAll(): void {
    this.unmountAll();
    const all = this.objects.getAll();
    const byParent = new Map<string | null, SceneObject[]>();
    for (const obj of all) {
      const key = obj.parentId;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(obj);
    }
    const mountSubtree = (parentId: string | null): void => {
      for (const obj of byParent.get(parentId) ?? []) {
        this.mount(obj);
        mountSubtree(obj.id);
      }
    };
    mountSubtree(null);
  }
}
