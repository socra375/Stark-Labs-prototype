import type { ObjectManager } from '../../core/ObjectManager';
import type { MaterialManager } from '../../3d/MaterialManager';
import type { AssetManager } from '../../3d/AssetManager';
import type { AssemblyManager } from '../AssemblyManager';
import type { InsertLibraryItemPayload } from '../../library/LibraryInsertion';
import type { Command } from './Command';

/** Same shape as ImportCommand, one step longer: assets -> materials -> components (parents
 * first) -> connections, since components can reference materials/assets and connections
 * reference components. undo() reverses in the opposite order. */
export class InsertLibraryItemCommand implements Command {
  constructor(
    private objects: ObjectManager,
    private materials: MaterialManager,
    private assets: AssetManager,
    private assembly: AssemblyManager,
    private payload: InsertLibraryItemPayload,
  ) {}

  execute(): void {
    for (const a of this.payload.assets) this.assets.insert(structuredClone(a));
    for (const m of this.payload.materials) this.materials.insert(structuredClone(m));
    for (const c of this.payload.components) this.objects.insert(structuredClone(c));
    for (const conn of this.payload.connections) this.assembly.insert(structuredClone(conn));
  }

  undo(): void {
    for (const conn of [...this.payload.connections].reverse()) this.assembly.disconnect(conn.id);
    for (const c of [...this.payload.components].reverse()) this.objects.remove(c.id, false);
    for (const m of this.payload.materials) this.materials.remove(m.id);
    for (const a of this.payload.assets) this.assets.remove(a.id);
  }

  describe(): string {
    return `Inserted "${this.payload.sourceName}" from library`;
  }
}
