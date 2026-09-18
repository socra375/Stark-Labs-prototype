import type { ObjectManager } from '../core/ObjectManager';
import type { AssemblyManager } from '../editor/AssemblyManager';
import type { ConstructionStageResult } from './types';
import type { ConstructionPlanStep } from '../ai/ConstructionPlan';
import { CONSTRUCTION_STAGES } from './stages';
import { generateConstructionPlan } from '../ai/ConstructionPlan';

/**
 * Stub orchestrator for the future MODEL -> COMPONENTS -> VOXELS -> LAYERS -> PLAN construction
 * pipeline, matching SimulationEngine's shape (a real module registry, a real run() entry point)
 * so the remaining stages can be implemented later without a redesign. Only PLAN has real logic
 * today, since it reuses the AI layer's already-real generateConstructionPlan(); the rest
 * honestly report not_implemented rather than a fabricated result.
 */
export class ConstructionEngine {
  constructor(private objects: ObjectManager, private assembly: AssemblyManager) {}

  listStages(): string[] {
    return CONSTRUCTION_STAGES.map((s) => s.name);
  }

  run(): ConstructionStageResult[] {
    return CONSTRUCTION_STAGES.map((s) => s.execute({ objects: this.objects, assembly: this.assembly }));
  }

  /** The real PLAN stage's step list, for display/export — separate from run()'s status-only
   * results so the UI/export path doesn't need to re-derive it from a message string. */
  getPlanSteps(): ConstructionPlanStep[] {
    return generateConstructionPlan(this.objects, this.assembly);
  }
}
