import type { ConstructionPlanStep } from '../ai/ConstructionPlan';

/** Exports the real, computed PLAN stage as a readable text file — never a fabricated
 * fabrication guide. MODEL/COMPONENTS/VOXELS/LAYERS aren't implemented yet, so there is nothing
 * real to export for those stages. */
export function formatConstructionPlanText(steps: ConstructionPlanStep[], projectName: string): string {
  const lines = [
    `STARK PROTOTYPE LAB — Construction Plan (${projectName})`,
    `Generated ${new Date().toISOString()}`,
    '',
    'This plan orders real objects from the current scene hierarchy and assembly connections.',
    'No physics/kinematics have been simulated — this is a build ORDER, not a validated build.',
    '',
  ];
  if (!steps.length) {
    lines.push('(No mesh objects in the scene yet.)');
  } else {
    for (const s of steps) lines.push(`${s.order}. [${s.action}] ${s.detail}`);
  }
  return lines.join('\n');
}
