import { buildTree, type TemplateResult } from './builder';

export function build(): TemplateResult {
  const components = buildTree([{ name: 'Prototype' }], {});
  return { components, materials: [] };
}
