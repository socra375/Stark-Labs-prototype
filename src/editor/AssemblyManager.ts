import type { EventBus } from '../core/EventBus';
import type { Connection, ConnectionType, Vec3 } from '../core/types';
import { generateId } from '../utils/ids';

/**
 * Assembly/Connect records a structural relationship between two objects — distinct from
 * Group (a real parent node for transforming pieces together) and from Parent/Child (spatial
 * hierarchy). Connecting two objects does NOT change parentId; it's independent metadata for
 * the assembly graph, consumed later by AnalysisEngine (disconnected-piece checks) and the
 * future bot/simulation layer.
 */
export class AssemblyManager {
  private connections = new Map<string, Connection>();

  constructor(private bus: EventBus) {}

  connect(parentObjectId: string, childObjectId: string, type: ConnectionType = 'FIXED', pointA: Vec3 = [0, 0, 0], pointB: Vec3 = [0, 0, 0]): Connection {
    const connection: Connection = {
      id: generateId('conn'),
      parentObjectId,
      childObjectId,
      connectionPointA: pointA,
      connectionPointB: pointB,
      type,
      createdAt: new Date().toISOString(),
    };
    this.connections.set(connection.id, connection);
    this.bus.emit('assembly:created', { connection });
    this.bus.emit('project:dirty', {});
    return connection;
  }

  insert(connection: Connection): void {
    this.connections.set(connection.id, connection);
    this.bus.emit('assembly:created', { connection });
    this.bus.emit('project:dirty', {});
  }

  /** No physical solver runs on `type` yet (see SimulationEngine) — it's real, stored data for a future one. */
  setType(connectionId: string, type: ConnectionType): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    connection.type = type;
    this.bus.emit('assembly:updated', { connection });
    this.bus.emit('project:dirty', {});
  }

  disconnect(connectionId: string): void {
    if (!this.connections.delete(connectionId)) return;
    this.bus.emit('assembly:removed', { connectionId });
    this.bus.emit('project:dirty', {});
  }

  get(id: string): Connection | undefined {
    return this.connections.get(id);
  }

  getAll(): Connection[] {
    return [...this.connections.values()];
  }

  getForObject(objectId: string): Connection[] {
    return this.getAll().filter((c) => c.parentObjectId === objectId || c.childObjectId === objectId);
  }

  existsBetween(objectIdA: string, objectIdB: string): Connection | undefined {
    return this.getAll().find(
      (c) =>
        (c.parentObjectId === objectIdA && c.childObjectId === objectIdB) ||
        (c.parentObjectId === objectIdB && c.childObjectId === objectIdA),
    );
  }

  removeAllForObject(objectId: string): void {
    for (const c of this.getForObject(objectId)) this.disconnect(c.id);
  }

  clear(): void {
    this.connections.clear();
  }

  loadAll(connections: Connection[]): void {
    this.clear();
    for (const c of connections) this.connections.set(c.id, { ...c });
  }

  serialize(): Connection[] {
    return this.getAll().map((c) => ({ ...c }));
  }
}
