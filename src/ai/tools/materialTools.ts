import type { AITool } from '../types';
import type { MaterialPreset } from '../../core/types';
import { AssignMaterialCommand } from '../../editor/commands/AssignMaterialCommand';

const VALID_PRESETS: Exclude<MaterialPreset, 'custom'>[] = ['metal', 'plastic', 'glass', 'fiber', 'titanium', 'carbonFiber', 'rubber', 'gold', 'redMetal', 'blueMetal'];

export const changeMaterialTool: AITool = {
  name: 'change_material',
  description: 'Assigns a new preset material (metal/plastic/glass/fiber/titanium/carbonFiber/rubber/gold/redMetal/blueMetal) to an object.',
  destructive: false,
  validate(args, ctx) {
    const errors: string[] = [];
    const obj = typeof args.objectId === 'string' ? ctx.objects.get(args.objectId) : undefined;
    if (!obj) errors.push('No matching object was found.');
    else if (obj.locked) errors.push(`${obj.name} is locked.`);
    else if (obj.type !== 'mesh') errors.push(`${obj.name} is a group and has no material.`);
    if (!VALID_PRESETS.includes(args.preset as never)) errors.push(`preset must be one of: ${VALID_PRESETS.join(', ')}.`);
    return { valid: !errors.length, errors };
  },
  preview(args, ctx) {
    const obj = ctx.objects.getOrThrow(args.objectId as string);
    const current = obj.material ? ctx.materials.get(obj.material) : undefined;
    return {
      operation: 'CHANGE_MATERIAL',
      targets: [{ id: obj.id, name: obj.name }],
      changes: [{ field: 'material', before: current?.preset ?? 'none', after: String(args.preset) }],
      affectedCount: 1,
      summary: `Change ${obj.name}'s material to ${args.preset}.`,
    };
  },
  buildCommand(args, ctx) {
    const def = ctx.materials.createPreset(args.preset as Exclude<MaterialPreset, 'custom'>);
    return new AssignMaterialCommand(ctx.objects, args.objectId as string, def.id);
  },
};

export const materialTools: AITool[] = [changeMaterialTool];
