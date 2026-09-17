import type { ReconstructionEngine } from './types';
import { HeightfieldReconstructionEngine } from './HeightfieldReconstructionEngine';

/** Facade mirroring AIService's provider-registry shape exactly, so a future heavier engine can
 * be registered and swapped in without touching the rest of STARK. */
export class ReconstructionService {
  private engines: Map<string, ReconstructionEngine>;
  private activeId = 'heightfield';

  constructor() {
    const heightfield = new HeightfieldReconstructionEngine();
    this.engines = new Map([[heightfield.id, heightfield]]);
  }

  get active(): ReconstructionEngine {
    return this.engines.get(this.activeId)!;
  }

  listEngines(): ReconstructionEngine[] {
    return [...this.engines.values()];
  }

  setActive(id: string): boolean {
    const engine = this.engines.get(id);
    if (!engine || !engine.available) return false;
    this.activeId = id;
    return true;
  }
}
