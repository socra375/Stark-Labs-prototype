import type { ConstructionStage, ConstructionStageName } from './types';
import { generateConstructionPlan } from '../ai/ConstructionPlan';

function stub(name: ConstructionStageName, futureDescription: string): ConstructionStage {
  return {
    name,
    execute() {
      return { stage: name, status: 'not_implemented', message: `${name} is not implemented yet. Future scope: ${futureDescription}` };
    },
  };
}

// MODEL/COMPONENTS/VOXELS/LAYERS have no real logic behind them yet — same honest-stub
// discipline as src/simulation/modules.ts. PLAN is real: it reuses the AI layer's
// generateConstructionPlan(), which is a genuine computation over the live object hierarchy and
// assembly connections (see src/ai/ConstructionPlan.ts), not a fabricated stage.
export const Model = stub('MODEL', 'segmenting the source model/reconstruction into distinct physical parts ready for fabrication.');
export const Components = stub('COMPONENTS', 'classifying each part by fabrication method (printed/machined/off-the-shelf) and material requirements.');
export const Voxels = stub('VOXELS', 'voxelizing geometry for printability and support-structure analysis.');
export const Layers = stub('LAYERS', 'slicing voxelized geometry into real print layers.');

export const Plan: ConstructionStage = {
  name: 'PLAN',
  execute(ctx) {
    const steps = generateConstructionPlan(ctx.objects, ctx.assembly);
    return {
      stage: 'PLAN',
      status: 'ok',
      message: steps.length
        ? `${steps.length} real step(s) computed from the current hierarchy and assembly connections.`
        : 'No mesh objects in the scene yet — nothing to plan.',
    };
  },
};

export const CONSTRUCTION_STAGES: ConstructionStage[] = [Model, Components, Voxels, Layers, Plan];
