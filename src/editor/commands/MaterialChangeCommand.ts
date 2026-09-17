import type { MaterialManager } from '../../3d/MaterialManager';
import type { MaterialDefinition } from '../../core/types';
import type { Command } from './Command';

/** Edits a shared MaterialDefinition's properties (color/metalness/roughness/...); affects every object referencing it. */
export class MaterialChangeCommand implements Command {
  constructor(
    private materials: MaterialManager,
    private materialId: string,
    private before: Partial<MaterialDefinition>,
    private after: Partial<MaterialDefinition>,
  ) {}

  execute(): void {
    this.materials.update(this.materialId, this.after);
  }

  undo(): void {
    this.materials.update(this.materialId, this.before);
  }

  describe(): string {
    return `Edited material ${this.materials.get(this.materialId)?.name ?? this.materialId}`;
  }
}
