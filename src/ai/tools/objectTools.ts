import type { AITool, ToolContext, ValidationResult } from '../types';
import type { GeometryType, Vec3 } from '../../core/types';
import { GEOMETRY_TYPES } from '../../3d/GeometryFactory';
import { CreateObjectCommand } from '../../editor/commands/CreateObjectCommand';
import { DeleteObjectCommand } from '../../editor/commands/DeleteObjectCommand';
import { DuplicateCommand } from '../../editor/commands/DuplicateCommand';
import { RenameCommand } from '../../editor/commands/RenameCommand';
import { TransformCommand, type TransformDelta } from '../../editor/commands/TransformCommand';
import { GroupCommand } from '../../editor/commands/GroupCommand';
import { UngroupCommand } from '../../editor/commands/UngroupCommand';
import { generateId } from '../../utils/ids';

function requireObject(objectId: unknown, ctx: ToolContext, errors: string[]) {
  if (typeof objectId !== 'string') { errors.push('No matching object was found.'); return null; }
  const obj = ctx.objects.get(objectId);
  if (!obj) { errors.push(`Object ${objectId} no longer exists.`); return null; }
  if (obj.locked) { errors.push(`${obj.name} is locked.`); return null; }
  return obj;
}

function requireObjects(objectIds: unknown, ctx: ToolContext, errors: string[]) {
  if (!Array.isArray(objectIds) || !objectIds.length) { errors.push('No matching objects were found.'); return []; }
  const objs = objectIds.map((id) => ctx.objects.get(id as string)).filter((o): o is NonNullable<typeof o> => !!o);
  const locked = objs.filter((o) => o.locked);
  if (locked.length) errors.push(`${locked.map((o) => o.name).join(', ')} ${locked.length > 1 ? 'are' : 'is'} locked.`);
  return locked.length ? [] : objs;
}

export const createObjectTool: AITool = {
  name: 'create_object',
  description: 'Creates a new primitive geometry object.',
  destructive: false,
  validate(args): ValidationResult {
    const errors: string[] = [];
    const type = args.geometryType as string;
    if (!GEOMETRY_TYPES.includes(type as GeometryType)) errors.push(`Unknown geometry type: ${type}`);
    if (typeof args.name !== 'string' || !args.name.trim()) errors.push('A name is required.');
    return { valid: !errors.length, errors };
  },
  preview(args) {
    return {
      operation: 'CREATE',
      targets: [],
      changes: [{ field: 'new object', before: '—', after: `${args.name} (${args.geometryType})` }],
      affectedCount: 1,
      summary: `Create a new ${args.geometryType} named "${args.name}".`,
    };
  },
  buildCommand(args, ctx) {
    const type = args.geometryType as GeometryType;
    const snapshot = {
      id: generateId('mesh'),
      name: String(args.name),
      type: 'mesh' as const,
      geometry: { type, params: (args.params as Record<string, number>) ?? {} },
      material: undefined,
      position: (args.position as Vec3) ?? [0, 0, 0],
      rotation: [0, 0, 0] as Vec3,
      scale: [1, 1, 1] as Vec3,
      parentId: null,
      children: [],
      visible: true,
      locked: false,
      metadata: {},
    };
    return new CreateObjectCommand(ctx.objects, [snapshot], `Created ${snapshot.name}`);
  },
};

export const deleteObjectTool: AITool = {
  name: 'delete_object',
  description: 'Deletes an object and its children.',
  destructive: true,
  validate(args, ctx) {
    const errors: string[] = [];
    requireObject(args.objectId, ctx, errors);
    return { valid: !errors.length, errors };
  },
  preview(args, ctx) {
    const obj = ctx.objects.getOrThrow(args.objectId as string);
    const descendants = ctx.objects.getDescendants(obj.id);
    return {
      operation: 'DELETE',
      targets: [{ id: obj.id, name: obj.name }],
      changes: [{ field: obj.name, before: 'present', after: 'removed' }],
      affectedCount: 1 + descendants.length,
      summary: `Delete "${obj.name}"${descendants.length ? ` and ${descendants.length} child object(s)` : ''}.`,
    };
  },
  buildCommand(args, ctx) {
    return new DeleteObjectCommand(ctx.objects, args.objectId as string);
  },
};

export const duplicateObjectTool: AITool = {
  name: 'duplicate_object',
  description: 'Duplicates an object and its children.',
  destructive: false,
  validate(args, ctx) {
    const errors: string[] = [];
    requireObject(args.objectId, ctx, errors);
    return { valid: !errors.length, errors };
  },
  preview(args, ctx) {
    const obj = ctx.objects.getOrThrow(args.objectId as string);
    return { operation: 'DUPLICATE', targets: [{ id: obj.id, name: obj.name }], changes: [{ field: 'copy', before: '—', after: `${obj.name} copy` }], affectedCount: 1, summary: `Duplicate "${obj.name}".` };
  },
  buildCommand(args, ctx) {
    return new DuplicateCommand(ctx.objects, args.objectId as string);
  },
};

export const renameObjectTool: AITool = {
  name: 'rename_object',
  description: 'Renames an object.',
  destructive: false,
  validate(args, ctx) {
    const errors: string[] = [];
    requireObject(args.objectId, ctx, errors);
    if (typeof args.name !== 'string' || !args.name.trim()) errors.push('A new name is required.');
    return { valid: !errors.length, errors };
  },
  preview(args, ctx) {
    const obj = ctx.objects.getOrThrow(args.objectId as string);
    return { operation: 'RENAME', targets: [{ id: obj.id, name: obj.name }], changes: [{ field: 'name', before: obj.name, after: String(args.name) }], affectedCount: 1, summary: `Rename "${obj.name}" to "${args.name}".` };
  },
  buildCommand(args, ctx) {
    return new RenameCommand(ctx.objects, args.objectId as string, String(args.name));
  },
};

function transformPreview(operation: string, objs: { id: string; name: string }[], field: string, before: string, after: string) {
  return { operation, targets: objs, changes: [{ field, before, after }], affectedCount: objs.length, summary: `${operation} ${objs.map((o) => o.name).join(', ')}.` };
}

export const moveObjectTool: AITool = {
  name: 'move_object',
  description: 'Sets an object’s absolute local position.',
  destructive: false,
  validate(args, ctx) {
    const errors: string[] = [];
    requireObject(args.objectId, ctx, errors);
    if (!Array.isArray(args.position) || args.position.length !== 3) errors.push('position must be [x, y, z].');
    return { valid: !errors.length, errors };
  },
  preview(args, ctx) {
    const obj = ctx.objects.getOrThrow(args.objectId as string);
    return transformPreview('MOVE', [{ id: obj.id, name: obj.name }], 'position', `[${obj.position.join(', ')}]`, `[${(args.position as number[]).join(', ')}]`);
  },
  buildCommand(args, ctx) {
    const obj = ctx.objects.getOrThrow(args.objectId as string);
    const before = { position: [...obj.position] as Vec3, rotation: [...obj.rotation] as Vec3, scale: [...obj.scale] as Vec3 };
    const after = { ...before, position: args.position as Vec3 };
    return new TransformCommand(ctx.objects, [{ objectId: obj.id, before, after }], `Moved ${obj.name}`);
  },
};

export const rotateObjectTool: AITool = {
  name: 'rotate_object',
  description: 'Sets an object’s absolute local rotation, in degrees.',
  destructive: false,
  validate(args, ctx) {
    const errors: string[] = [];
    requireObject(args.objectId, ctx, errors);
    if (!Array.isArray(args.rotationDeg) || args.rotationDeg.length !== 3) errors.push('rotationDeg must be [x, y, z].');
    return { valid: !errors.length, errors };
  },
  preview(args, ctx) {
    const obj = ctx.objects.getOrThrow(args.objectId as string);
    const beforeDeg = obj.rotation.map((r) => (r * 180) / Math.PI);
    return transformPreview('ROTATE', [{ id: obj.id, name: obj.name }], 'rotation (deg)', `[${beforeDeg.map((n) => n.toFixed(1)).join(', ')}]`, `[${(args.rotationDeg as number[]).join(', ')}]`);
  },
  buildCommand(args, ctx) {
    const obj = ctx.objects.getOrThrow(args.objectId as string);
    const before = { position: [...obj.position] as Vec3, rotation: [...obj.rotation] as Vec3, scale: [...obj.scale] as Vec3 };
    const rotationRad = (args.rotationDeg as number[]).map((d) => (d * Math.PI) / 180) as Vec3;
    return new TransformCommand(ctx.objects, [{ objectId: obj.id, before, after: { ...before, rotation: rotationRad } }], `Rotated ${obj.name}`);
  },
};

export const scaleObjectTool: AITool = {
  name: 'scale_object',
  description: 'Scales one or more objects by a relative factor (e.g. 1.1 = +10%). Supports a single objectId or objectIds for group phrases like "both arms".',
  destructive: false,
  validate(args, ctx) {
    const errors: string[] = [];
    const single = args.objectId ? [args.objectId] : [];
    const many = Array.isArray(args.objectIds) ? args.objectIds : [];
    const ids = [...single, ...many];
    if (!ids.length) errors.push('No matching object(s) found.');
    else requireObjects(ids, ctx, errors);
    if (typeof args.factor !== 'number' || args.factor <= 0) errors.push('factor must be a positive number.');
    return { valid: !errors.length, errors };
  },
  preview(args, ctx) {
    const ids = [...(args.objectId ? [args.objectId as string] : []), ...((args.objectIds as string[]) ?? [])];
    const objs = requireObjects(ids, ctx, []);
    const factor = args.factor as number;
    return {
      operation: 'SCALE',
      targets: objs.map((o) => ({ id: o.id, name: o.name })),
      changes: objs.map((o) => ({ field: `${o.name}.scale`, before: `[${o.scale.map((s) => s.toFixed(2)).join(', ')}]`, after: `[${o.scale.map((s) => (s * factor).toFixed(2)).join(', ')}]` })),
      affectedCount: objs.length,
      summary: `Scale ${objs.map((o) => o.name).join(', ')} by ${((factor - 1) * 100).toFixed(0)}%.`,
    };
  },
  buildCommand(args, ctx) {
    const ids = [...(args.objectId ? [args.objectId as string] : []), ...((args.objectIds as string[]) ?? [])];
    const factor = args.factor as number;
    const deltas: TransformDelta[] = ids.map((id) => {
      const obj = ctx.objects.getOrThrow(id);
      const before = { position: [...obj.position] as Vec3, rotation: [...obj.rotation] as Vec3, scale: [...obj.scale] as Vec3 };
      const after = { ...before, scale: obj.scale.map((s) => s * factor) as Vec3 };
      return { objectId: id, before, after };
    });
    return new TransformCommand(ctx.objects, deltas, `Scaled ${deltas.length} object(s) by ${((factor - 1) * 100).toFixed(0)}%`);
  },
};

export const groupObjectsTool: AITool = {
  name: 'group_objects',
  description: 'Groups two or more objects under a new parent.',
  destructive: false,
  validate(args, ctx) {
    const errors: string[] = [];
    const ids = (args.objectIds as string[]) ?? [];
    if (ids.length < 2) errors.push('At least two objects are required to group.');
    else requireObjects(ids, ctx, errors);
    return { valid: !errors.length, errors };
  },
  preview(args, ctx) {
    const objs = requireObjects(args.objectIds, ctx, []);
    return { operation: 'GROUP', targets: objs.map((o) => ({ id: o.id, name: o.name })), changes: [{ field: 'parent', before: 'separate', after: 'new Group' }], affectedCount: objs.length, summary: `Group ${objs.map((o) => o.name).join(', ')}.` };
  },
  buildCommand(args, ctx) {
    const plan = ctx.grouping.planGroup(args.objectIds as string[]);
    if (!plan) throw new Error('Could not build a group plan.');
    return new GroupCommand(ctx.objects, plan);
  },
};

export const ungroupObjectsTool: AITool = {
  name: 'ungroup_objects',
  description: 'Ungroups a group, restoring its children to the parent above it.',
  destructive: false,
  validate(args, ctx) {
    const errors: string[] = [];
    const obj = requireObject(args.objectId, ctx, errors);
    if (obj && obj.type !== 'group') errors.push(`${obj.name} is not a group.`);
    return { valid: !errors.length, errors };
  },
  preview(args, ctx) {
    const obj = ctx.objects.getOrThrow(args.objectId as string);
    return { operation: 'UNGROUP', targets: [{ id: obj.id, name: obj.name }], changes: [{ field: 'group', before: obj.name, after: 'removed' }], affectedCount: ctx.objects.getChildren(obj.id).length, summary: `Ungroup "${obj.name}".` };
  },
  buildCommand(args, ctx) {
    const plan = ctx.grouping.planUngroup(args.objectId as string);
    if (!plan) throw new Error('Could not build an ungroup plan.');
    return new UngroupCommand(ctx.objects, plan);
  },
};

export const mirrorObjectTool: AITool = {
  name: 'mirror_object',
  description: 'Mirrors an object across the X, Y, or Z world plane, creating a new mirrored copy.',
  destructive: false,
  validate(args, ctx) {
    const errors: string[] = [];
    requireObject(args.objectId, ctx, errors);
    if (!['x', 'y', 'z'].includes(args.axis as string)) errors.push('axis must be x, y, or z.');
    return { valid: !errors.length, errors };
  },
  preview(args, ctx) {
    const obj = ctx.objects.getOrThrow(args.objectId as string);
    return { operation: 'MIRROR', targets: [{ id: obj.id, name: obj.name }], changes: [{ field: 'axis', before: '—', after: String(args.axis).toUpperCase() }], affectedCount: 1 + ctx.objects.getDescendants(obj.id).length, summary: `Mirror "${obj.name}" across ${String(args.axis).toUpperCase()}.` };
  },
  buildCommand(args, ctx) {
    const obj = ctx.objects.getOrThrow(args.objectId as string);
    const snapshots = ctx.mirror.planMirror(obj.id, args.axis as 'x' | 'y' | 'z');
    return new CreateObjectCommand(ctx.objects, snapshots, `Mirrored ${obj.name} across ${String(args.axis).toUpperCase()}`);
  },
};

export const objectTools: AITool[] = [
  createObjectTool,
  deleteObjectTool,
  duplicateObjectTool,
  renameObjectTool,
  moveObjectTool,
  rotateObjectTool,
  scaleObjectTool,
  groupObjectsTool,
  ungroupObjectsTool,
  mirrorObjectTool,
];
