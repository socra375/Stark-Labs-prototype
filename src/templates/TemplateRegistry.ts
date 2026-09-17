import type { TemplateResult } from './builder';
import { build as buildBlank } from './blank';
import { build as buildHumanoid } from './humanoid';
import { build as buildExosuit } from './exosuit';
import { build as buildRobot } from './robot';
import { build as buildVehicle } from './vehicle';

export interface TemplateSpec {
  id: string;
  name: string;
  description: string;
  build: () => TemplateResult;
}

export const TEMPLATES: TemplateSpec[] = [
  { id: 'blank', name: 'Blank', description: 'An empty project with a single root group.', build: buildBlank },
  { id: 'humanoid', name: 'Humanoid', description: 'A symmetric humanoid rig: torso, head, arms, legs.', build: buildHumanoid },
  { id: 'exosuit', name: 'Exosuit', description: 'A powered exosuit: reactor core, plated torso, helmet, actuated limbs.', build: buildExosuit },
  { id: 'robot', name: 'Robot', description: 'A wheeled utility robot with a sensor head and grasping arms.', build: buildRobot },
  { id: 'vehicle', name: 'Vehicle', description: 'A 4-wheeled vehicle chassis with a cabin and windshield.', build: buildVehicle },
];

export function getTemplate(id: string): TemplateSpec {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
