import type { NotImplementedResult } from './types';
import { SIMULATION_MODULES } from './modules';

/**
 * Stub orchestrator for future physics/movement/collision/weight/center-of-mass/structural
 * simulation. The architecture (a real module registry, a real run() entry point) exists now
 * so those modules can be implemented later without a redesign, but run() honestly reports
 * that nothing is implemented yet rather than returning a fabricated result. Section 20 of the
 * spec is explicit: never claim a prototype is physically viable off a fake simulation.
 */
export class SimulationEngine {
  listModules(): string[] {
    return SIMULATION_MODULES.map((m) => m.name);
  }

  run(): NotImplementedResult[] {
    return SIMULATION_MODULES.map((m) => m.execute());
  }
}
