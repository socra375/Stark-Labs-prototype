import { buildTree, makeMaterial, type TemplateNode, type TemplateResult } from './builder';

function arm(side: 'L' | 'R', x: number): TemplateNode {
  return {
    name: `Arm_${side}`,
    position: [x, 0.28, 0],
    metadata: { role: 'arm', symmetryGroup: 'arm' },
    children: [
      { name: 'Shoulder', geometry: { type: 'sphere', params: { radius: 0.09 } }, material: 'plastic' },
      { name: 'Upperarm', geometry: { type: 'capsule', params: { radius: 0.07, length: 0.24 } }, material: 'plastic', position: [0, -0.2, 0] },
      { name: 'Forearm', geometry: { type: 'capsule', params: { radius: 0.06, length: 0.22 } }, material: 'plastic', position: [0, -0.48, 0] },
      { name: 'Hand', geometry: { type: 'box', params: { width: 0.1, height: 0.12, depth: 0.08 } }, material: 'plastic', position: [0, -0.68, 0] },
    ],
  };
}

function leg(side: 'L' | 'R', x: number): TemplateNode {
  return {
    name: `Leg_${side}`,
    position: [x, -0.35, 0],
    metadata: { role: 'leg', symmetryGroup: 'leg' },
    children: [
      { name: 'Hip', geometry: { type: 'sphere', params: { radius: 0.1 } }, material: 'plastic' },
      { name: 'Thigh', geometry: { type: 'capsule', params: { radius: 0.09, length: 0.28 } }, material: 'plastic', position: [0, -0.25, 0] },
      { name: 'Shin', geometry: { type: 'capsule', params: { radius: 0.07, length: 0.26 } }, material: 'plastic', position: [0, -0.58, 0] },
      { name: 'Foot', geometry: { type: 'box', params: { width: 0.12, height: 0.08, depth: 0.22 } }, material: 'plastic', position: [0, -0.78, 0.04] },
    ],
  };
}

export function build(): TemplateResult {
  const plastic = makeMaterial('plastic', 'plastic');
  const materialsByKey = { plastic };

  const tree: TemplateNode[] = [
    {
      name: 'Humanoid',
      children: [
        {
          name: 'Torso',
          geometry: { type: 'box', params: { width: 0.5, height: 0.7, depth: 0.3 } },
          material: 'plastic',
          position: [0, 1.1, 0],
          children: [
            { name: 'Head', geometry: { type: 'sphere', params: { radius: 0.18 } }, material: 'plastic', position: [0, 0.55, 0] },
            arm('L', -0.32),
            arm('R', 0.32),
            leg('L', -0.14),
            leg('R', 0.14),
          ],
        },
      ],
    },
  ];

  return { components: buildTree(tree, materialsByKey), materials: Object.values(materialsByKey) };
}
