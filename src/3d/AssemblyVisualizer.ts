import * as THREE from 'three';
import type { EventBus } from '../core/EventBus';
import type { AssemblyManager } from '../editor/AssemblyManager';
import type { CoordinateSystem } from './CoordinateSystem';

const LINE_COLOR = 0xffb454;

/** Draws a line between each connected object pair's world position; kept live via bus events + a per-frame refresh. */
export class AssemblyVisualizer {
  private group = new THREE.Group();
  private lines = new Map<string, THREE.Line>();

  constructor(private bus: EventBus, private assembly: AssemblyManager, private coords: CoordinateSystem, scene: THREE.Scene) {
    this.group.name = 'assemblyLines';
    scene.add(this.group);
    this.bus.on('assembly:created', ({ connection }) => this.addLine(connection.id));
    this.bus.on('assembly:removed', ({ connectionId }) => this.removeLine(connectionId));
    this.bus.on('object:updated', () => this.refreshAll());
    this.bus.on('object:removed', () => this.refreshAll());
  }

  private addLine(connectionId: string): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const material = new THREE.LineDashedMaterial({ color: LINE_COLOR, dashSize: 0.08, gapSize: 0.05 });
    const line = new THREE.Line(geometry, material);
    line.name = connectionId;
    this.group.add(line);
    this.lines.set(connectionId, line);
    this.refreshLine(connectionId);
  }

  private removeLine(connectionId: string): void {
    const line = this.lines.get(connectionId);
    if (!line) return;
    line.geometry.dispose();
    (line.material as THREE.Material).dispose();
    this.group.remove(line);
    this.lines.delete(connectionId);
  }

  private refreshLine(connectionId: string): void {
    const conn = this.assembly.get(connectionId);
    const line = this.lines.get(connectionId);
    if (!conn || !line) return;
    try {
      const a = this.coords.getWorldTransform(conn.parentObjectId).position;
      const b = this.coords.getWorldTransform(conn.childObjectId).position;
      line.geometry.setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]);
      line.computeLineDistances();
    } catch {
      // Referenced object no longer exists; line will be removed on the next assembly:removed event.
    }
  }

  refreshAll(): void {
    for (const id of this.lines.keys()) this.refreshLine(id);
  }

  dispose(): void {
    for (const id of [...this.lines.keys()]) this.removeLine(id);
    this.group.removeFromParent();
  }
}
