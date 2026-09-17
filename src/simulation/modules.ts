import type { SimulationModule, NotImplementedResult } from './types';

function stub(name: string, futureDescription: string): SimulationModule {
  return {
    name,
    execute(): NotImplementedResult {
      return { status: 'not_implemented', module: name, message: `${name} is not implemented yet. Future scope: ${futureDescription}` };
    },
  };
}

// Each future module of SimulationEngine, per the architecture doc. None fabricate a result —
// every execute() call returns the same honest not-implemented shape as the others.
export const Physics = stub('Physics', 'rigid-body dynamics and gravity/actuator forces on the assembled prototype.');
export const Movement = stub('Movement', 'kinematic simulation of articulated joints and range-of-motion checks.');
export const Collision = stub('Collision', 'broad/narrow-phase collision detection between components.');
export const Weight = stub('Weight', 'density-weighted mass computed from real geometry + material, not just bounding-box volume.');
export const CenterOfMass = stub('CenterOfMass', 'a physically simulated center of mass (see AnalysisEngine for today’s bounding-box ESTIMATION).');
export const StructuralAnalysis = stub('StructuralAnalysis', 'stress/load analysis on connections and materials.');

export const SIMULATION_MODULES: SimulationModule[] = [Physics, Movement, Collision, Weight, CenterOfMass, StructuralAnalysis];
