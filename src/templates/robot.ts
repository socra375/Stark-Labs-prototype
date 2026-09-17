import { buildTree, makeMaterial, type TemplateNode, type TemplateResult } from './builder';

function arm(side: 'L' | 'R', x: number): TemplateNode {
  return {
    name: `Arm_${side}`,
    position: [x, 0.15, 0.1],
    metadata: { role: 'arm', symmetryGroup: 'arm' },
    children: [
      { name: 'Shoulder', geometry: { type: 'sphere', params: { radius: 0.08 } }, material: 'metal' },
      { name: 'Forearm', geometry: { type: 'cylinder', params: { radiusTop: 0.05, radiusBottom: 0.05, height: 0.3 } }, material: 'metal', position: [0, -0.2, 0] },
      { name: 'Claw_1', geometry: { type: 'box', params: { width: 0.03, height: 0.1, depth: 0.03 } }, material: 'metal', position: [0.03, -0.4, 0] },
      { name: 'Claw_2', geometry: { type: 'box', params: { width: 0.03, height: 0.1, depth: 0.03 } }, material: 'metal', position: [-0.03, -0.4, 0] },
    ],
  };
}

function wheel(name: string, x: number, z: number): TemplateNode {
  return {
    name,
    geometry: { type: 'cylinder', params: { radiusTop: 0.14, radiusBottom: 0.14, height: 0.08 } },
    material: 'fiber',
    position: [x, -0.2, z],
    rotation: [0, 0, Math.PI / 2],
  };
}

export function build(): TemplateResult {
  const metal = makeMaterial('metal', 'metal');
  const fiber = makeMaterial('fiber', 'fiber');
  const materialsByKey = { metal, fiber };

  const tree: TemplateNode[] = [
    {
      name: 'Robot',
      children: [
        {
          name: 'Chassis',
          geometry: { type: 'box', params: { width: 0.6, height: 0.3, depth: 0.4 } },
          material: 'metal',
          position: [0, 0.4, 0],
          children: [
            {
              name: 'Head',
              geometry: { type: 'box', params: { width: 0.2, height: 0.2, depth: 0.2 } },
              material: 'metal',
              position: [0, 0.28, 0],
              children: [{ name: 'Sensor', geometry: { type: 'cylinder', params: { radiusTop: 0.04, radiusBottom: 0.04, height: 0.1 } }, material: 'metal', position: [0, 0.12, 0] }],
            },
            arm('L', -0.35),
            arm('R', 0.35),
            wheel('Wheel_FL', -0.32, 0.16),
            wheel('Wheel_FR', 0.32, 0.16),
            wheel('Wheel_BL', -0.32, -0.16),
            wheel('Wheel_BR', 0.32, -0.16),
          ],
        },
      ],
    },
  ];

  return { components: buildTree(tree, materialsByKey), materials: Object.values(materialsByKey) };
}
