import { buildTree, makeMaterial, type TemplateNode, type TemplateResult } from './builder';

function arm(side: 'L' | 'R', x: number): TemplateNode {
  return {
    name: `Arm_${side}`,
    position: [x, 0.3, 0],
    metadata: { role: 'arm', symmetryGroup: 'arm' },
    children: [
      { name: 'Shoulder', geometry: { type: 'sphere', params: { radius: 0.11 } }, material: 'metal' },
      { name: 'Actuator', geometry: { type: 'cylinder', params: { radiusTop: 0.07, radiusBottom: 0.07, height: 0.22 } }, material: 'metal', position: [0, -0.18, 0] },
      { name: 'Forearm', geometry: { type: 'capsule', params: { radius: 0.07, length: 0.22 } }, material: 'metal', position: [0, -0.46, 0] },
      { name: 'Gauntlet', geometry: { type: 'box', params: { width: 0.12, height: 0.14, depth: 0.1 } }, material: 'metal', position: [0, -0.68, 0] },
    ],
  };
}

function leg(side: 'L' | 'R', x: number): TemplateNode {
  return {
    name: `Leg_${side}`,
    position: [x, -0.38, 0],
    metadata: { role: 'leg', symmetryGroup: 'leg' },
    children: [
      { name: 'Hip', geometry: { type: 'sphere', params: { radius: 0.12 } }, material: 'metal' },
      { name: 'Thruster', geometry: { type: 'cone', params: { radius: 0.09, height: 0.2 } }, material: 'glass', rotation: [Math.PI, 0, 0], position: [0, -0.28, 0] },
      { name: 'Shin', geometry: { type: 'capsule', params: { radius: 0.08, length: 0.28 } }, material: 'metal', position: [0, -0.58, 0] },
      { name: 'Boot', geometry: { type: 'box', params: { width: 0.13, height: 0.09, depth: 0.24 } }, material: 'metal', position: [0, -0.8, 0.04] },
    ],
  };
}

export function build(): TemplateResult {
  const metal = makeMaterial('metal', 'metal');
  const glass = makeMaterial('glass', 'glass');
  const materialsByKey = { metal, glass };

  const tree: TemplateNode[] = [
    {
      name: 'Exosuit',
      children: [
        {
          name: 'Torso',
          geometry: { type: 'box', params: { width: 0.55, height: 0.75, depth: 0.35 } },
          material: 'metal',
          position: [0, 1.15, 0],
          children: [
            { name: 'Reactor', geometry: { type: 'cylinder', params: { radiusTop: 0.09, radiusBottom: 0.09, height: 0.08 } }, material: 'glass', position: [0, 0, 0.19], rotation: [Math.PI / 2, 0, 0] },
            { name: 'PlacaFrontal', geometry: { type: 'box', params: { width: 0.5, height: 0.6, depth: 0.03 } }, material: 'metal', position: [0, 0, 0.17] },
            { name: 'PlacaTrasera', geometry: { type: 'box', params: { width: 0.5, height: 0.6, depth: 0.03 } }, material: 'metal', position: [0, 0, -0.17] },
            {
              name: 'Helmet',
              geometry: { type: 'sphere', params: { radius: 0.2 } },
              material: 'metal',
              position: [0, 0.58, 0],
              children: [{ name: 'Visor', geometry: { type: 'plane', params: { width: 0.22, height: 0.1 } }, material: 'glass', position: [0, -0.02, 0.19] }],
            },
            arm('L', -0.35),
            arm('R', 0.35),
            leg('L', -0.16),
            leg('R', 0.16),
          ],
        },
      ],
    },
  ];

  return { components: buildTree(tree, materialsByKey), materials: Object.values(materialsByKey) };
}
