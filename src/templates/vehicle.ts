import { buildTree, makeMaterial, type TemplateNode, type TemplateResult } from './builder';

function wheel(name: string, x: number, z: number): TemplateNode {
  return {
    name,
    geometry: { type: 'cylinder', params: { radiusTop: 0.18, radiusBottom: 0.18, height: 0.12 } },
    material: 'fiber',
    position: [x, -0.15, z],
    rotation: [0, 0, Math.PI / 2],
  };
}

export function build(): TemplateResult {
  const metal = makeMaterial('metal', 'metal');
  const glass = makeMaterial('glass', 'glass');
  const fiber = makeMaterial('fiber', 'fiber');
  const materialsByKey = { metal, glass, fiber };

  const tree: TemplateNode[] = [
    {
      name: 'Vehicle',
      children: [
        {
          name: 'Chassis',
          geometry: { type: 'box', params: { width: 0.9, height: 0.25, depth: 1.8 } },
          material: 'metal',
          position: [0, 0.35, 0],
          children: [
            {
              name: 'Cabin',
              geometry: { type: 'box', params: { width: 0.8, height: 0.35, depth: 0.9 } },
              material: 'metal',
              position: [0, 0.28, -0.1],
              children: [{ name: 'Windshield', geometry: { type: 'plane', params: { width: 0.7, height: 0.3 } }, material: 'glass', position: [0, 0.05, 0.45], rotation: [-Math.PI / 6, 0, 0] }],
            },
            { name: 'Bumper_Front', geometry: { type: 'box', params: { width: 0.85, height: 0.1, depth: 0.08 } }, material: 'metal', position: [0, -0.05, 0.88] },
            { name: 'Bumper_Rear', geometry: { type: 'box', params: { width: 0.85, height: 0.1, depth: 0.08 } }, material: 'metal', position: [0, -0.05, -0.88] },
            wheel('Wheel_FL', -0.48, 0.6),
            wheel('Wheel_FR', 0.48, 0.6),
            wheel('Wheel_BL', -0.48, -0.6),
            wheel('Wheel_BR', 0.48, -0.6),
          ],
        },
      ],
    },
  ];

  return { components: buildTree(tree, materialsByKey), materials: Object.values(materialsByKey) };
}
