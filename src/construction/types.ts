import type { ObjectManager } from '../core/ObjectManager';
import type { AssemblyManager } from '../editor/AssemblyManager';

export type ConstructionStageName = 'MODEL' | 'COMPONENTS' | 'VOXELS' | 'LAYERS' | 'PLAN';

/** A stage either honestly reports it isn't implemented yet, or (PLAN only, which reuses the
 * real AI-layer construction-plan computation) reports a real result — never a fabricated
 * number for the stages that don't have real logic behind them yet. */
export interface ConstructionStageResult {
  stage: ConstructionStageName;
  status: 'not_implemented' | 'ok';
  message: string;
}

export interface ConstructionStageContext {
  objects: ObjectManager;
  assembly: AssemblyManager;
}

export interface ConstructionStage {
  readonly name: ConstructionStageName;
  execute(ctx: ConstructionStageContext): ConstructionStageResult;
}
