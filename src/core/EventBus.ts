import type { SceneObject, Connection } from './types';
import type { AppTool } from './AppState';

export interface EventMap {
  'object:created': { object: SceneObject };
  'object:updated': { objectId: string; patch: Partial<SceneObject> };
  'object:removed': { objectId: string };
  'object:transformed': { objectId: string; source: 'gizmo' | 'inspector' | 'command' };
  'scene:cleared': {};
  'scene:loaded': {};
  'selection:changed': { objectIds: string[] };
  'tool:changed': { tool: AppTool };
  'history:changed': {};
  'material:updated': { materialId: string };
  'assembly:created': { connection: Connection };
  'assembly:updated': { connection: Connection };
  'assembly:removed': { connectionId: string };
  'version:created': { versionId: string };
  'version:restored': { versionId: string };
  'project:dirty': {};
  'project:saved': { projectId: string };
}

type Listener<K extends keyof EventMap> = (payload: EventMap[K]) => void;

export class EventBus {
  private listeners = new Map<keyof EventMap, Set<Listener<any>>>();

  on<K extends keyof EventMap>(event: K, fn: Listener<K>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
    return () => this.off(event, fn);
  }

  off<K extends keyof EventMap>(event: K, fn: Listener<K>): void {
    this.listeners.get(event)?.delete(fn);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of [...set]) fn(payload);
  }
}
