import type { EventBus } from './EventBus';
import type { SceneObject, Vec3, GeometryDefinition, SceneObjectType } from './types';
import { generateId } from '../utils/ids';

export interface CreateObjectInput {
  id?: string;
  name: string;
  type: SceneObjectType;
  geometry?: GeometryDefinition;
  material?: string;
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
  parentId?: string | null;
  metadata?: Record<string, unknown>;
}

/** Owns the SceneObject tree: single source of truth for the model. No Three.js here. */
export class ObjectManager {
  private objects = new Map<string, SceneObject>();
  private rootIds: string[] = [];

  constructor(private bus: EventBus) {}

  create(input: CreateObjectInput): SceneObject {
    const id = input.id ?? generateId(input.type === 'group' ? 'grp' : 'mesh');
    const obj: SceneObject = {
      id,
      name: input.name,
      type: input.type,
      geometry: input.geometry,
      material: input.material,
      position: input.position ?? [0, 0, 0],
      rotation: input.rotation ?? [0, 0, 0],
      scale: input.scale ?? [1, 1, 1],
      parentId: input.parentId ?? null,
      children: [],
      visible: true,
      locked: false,
      metadata: { origin: 'build', ...(input.metadata ?? {}) },
    };
    this.objects.set(id, obj);
    if (obj.parentId) {
      const parent = this.objects.get(obj.parentId);
      if (parent) parent.children.push(id);
    } else {
      this.rootIds.push(id);
    }
    this.bus.emit('object:created', { object: obj });
    this.bus.emit('project:dirty', {});
    return obj;
  }

  /** Re-inserts a fully-formed SceneObject (used by undo, import, version restore) without generating a new id. */
  insert(obj: SceneObject): void {
    this.objects.set(obj.id, obj);
    if (obj.parentId) {
      const parent = this.objects.get(obj.parentId);
      if (parent && !parent.children.includes(obj.id)) parent.children.push(obj.id);
    } else if (!this.rootIds.includes(obj.id)) {
      this.rootIds.push(obj.id);
    }
    this.bus.emit('object:created', { object: obj });
    this.bus.emit('project:dirty', {});
  }

  get(id: string): SceneObject | undefined {
    return this.objects.get(id);
  }

  getOrThrow(id: string): SceneObject {
    const obj = this.objects.get(id);
    if (!obj) throw new Error(`SceneObject not found: ${id}`);
    return obj;
  }

  getAll(): SceneObject[] {
    return [...this.objects.values()];
  }

  getRootIds(): string[] {
    return [...this.rootIds];
  }

  getChildren(id: string): SceneObject[] {
    const obj = this.objects.get(id);
    if (!obj) return [];
    return obj.children.map((cid) => this.objects.get(cid)).filter((o): o is SceneObject => !!o);
  }

  getAncestors(id: string): SceneObject[] {
    const chain: SceneObject[] = [];
    let current = this.objects.get(id);
    while (current?.parentId) {
      const parent = this.objects.get(current.parentId);
      if (!parent) break;
      chain.push(parent);
      current = parent;
    }
    return chain;
  }

  getDescendants(id: string): SceneObject[] {
    const result: SceneObject[] = [];
    const stack = [...this.getChildren(id)];
    while (stack.length) {
      const obj = stack.pop()!;
      result.push(obj);
      stack.push(...this.getChildren(obj.id));
    }
    return result;
  }

  update(id: string, patch: Partial<SceneObject>): void {
    const obj = this.objects.get(id);
    if (!obj) return;
    Object.assign(obj, patch);
    this.bus.emit('object:updated', { objectId: id, patch });
    this.bus.emit('project:dirty', {});
  }

  /** Reparents an object, keeping its stored local transform unchanged (callers wanting world-pose preservation use CoordinateSystem first). */
  reparent(id: string, newParentId: string | null): void {
    const obj = this.objects.get(id);
    if (!obj) return;
    const oldParentId = obj.parentId;
    if (oldParentId) {
      const oldParent = this.objects.get(oldParentId);
      if (oldParent) oldParent.children = oldParent.children.filter((c) => c !== id);
    } else {
      this.rootIds = this.rootIds.filter((r) => r !== id);
    }
    obj.parentId = newParentId;
    if (newParentId) {
      const newParent = this.objects.get(newParentId);
      if (newParent && !newParent.children.includes(id)) newParent.children.push(id);
    } else {
      this.rootIds.push(id);
    }
    this.bus.emit('object:updated', { objectId: id, patch: { parentId: newParentId } });
    this.bus.emit('project:dirty', {});
  }

  remove(id: string, cascade = true): void {
    const obj = this.objects.get(id);
    if (!obj) return;
    if (cascade) {
      for (const childId of [...obj.children]) this.remove(childId, cascade);
    }
    if (obj.parentId) {
      const parent = this.objects.get(obj.parentId);
      if (parent) parent.children = parent.children.filter((c) => c !== id);
    } else {
      this.rootIds = this.rootIds.filter((r) => r !== id);
    }
    this.objects.delete(id);
    this.bus.emit('object:removed', { objectId: id });
    this.bus.emit('project:dirty', {});
  }

  clear(): void {
    this.objects.clear();
    this.rootIds = [];
    this.bus.emit('scene:cleared', {});
  }

  loadAll(objects: SceneObject[]): void {
    this.clear();
    for (const obj of objects) {
      this.objects.set(obj.id, { ...obj, children: [...obj.children] });
    }
    this.rootIds = objects.filter((o) => !o.parentId).map((o) => o.id);
    this.bus.emit('scene:loaded', {});
  }

  serialize(): SceneObject[] {
    return this.getAll().map((o) => ({ ...o, position: [...o.position], rotation: [...o.rotation], scale: [...o.scale], children: [...o.children] }));
  }
}
