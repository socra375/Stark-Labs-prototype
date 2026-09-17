import type { AITool } from '../types';
import type { Connection } from '../../core/types';
import { ConnectCommand } from '../../editor/commands/ConnectCommand';
import { DisconnectCommand } from '../../editor/commands/DisconnectCommand';
import { generateId } from '../../utils/ids';

export const connectObjectsTool: AITool = {
  name: 'connect_objects',
  description: 'Records a structural connection between two objects (does not change parent/child hierarchy).',
  destructive: false,
  validate(args, ctx) {
    const errors: string[] = [];
    const a = typeof args.objectIdA === 'string' ? ctx.objects.get(args.objectIdA) : undefined;
    const b = typeof args.objectIdB === 'string' ? ctx.objects.get(args.objectIdB) : undefined;
    if (!a || !b) errors.push('Both objects must exist.');
    else if (a.id === b.id) errors.push('Cannot connect an object to itself.');
    else if (ctx.assembly.existsBetween(a.id, b.id)) errors.push(`${a.name} and ${b.name} are already connected.`);
    return { valid: !errors.length, errors };
  },
  preview(args, ctx) {
    const a = ctx.objects.getOrThrow(args.objectIdA as string);
    const b = ctx.objects.getOrThrow(args.objectIdB as string);
    return { operation: 'CONNECT', targets: [{ id: a.id, name: a.name }, { id: b.id, name: b.name }], changes: [{ field: 'connection', before: 'none', after: `${a.name} ↔ ${b.name}` }], affectedCount: 2, summary: `Connect "${a.name}" and "${b.name}".` };
  },
  buildCommand(args, ctx) {
    const connection: Connection = {
      id: generateId('conn'),
      parentObjectId: args.objectIdA as string,
      childObjectId: args.objectIdB as string,
      connectionPointA: [0, 0, 0],
      connectionPointB: [0, 0, 0],
      type: 'FIXED',
      createdAt: new Date().toISOString(),
    };
    return new ConnectCommand(ctx.assembly, connection);
  },
};

export const disconnectObjectsTool: AITool = {
  name: 'disconnect_objects',
  description: 'Removes the structural connection between two objects.',
  destructive: false,
  validate(args, ctx) {
    const errors: string[] = [];
    const a = args.objectIdA as string;
    const b = args.objectIdB as string;
    const conn = a && b ? ctx.assembly.existsBetween(a, b) : undefined;
    if (!conn) errors.push('No connection exists between those objects.');
    return { valid: !errors.length, errors };
  },
  preview(args, ctx) {
    const conn = ctx.assembly.existsBetween(args.objectIdA as string, args.objectIdB as string)!;
    const a = ctx.objects.get(conn.parentObjectId);
    const b = ctx.objects.get(conn.childObjectId);
    return { operation: 'DISCONNECT', targets: [], changes: [{ field: 'connection', before: `${a?.name} ↔ ${b?.name}`, after: 'removed' }], affectedCount: 2, summary: `Disconnect "${a?.name}" and "${b?.name}".` };
  },
  buildCommand(args, ctx) {
    const conn = ctx.assembly.existsBetween(args.objectIdA as string, args.objectIdB as string)!;
    return new DisconnectCommand(ctx.assembly, conn.id);
  },
};

export const assemblyTools: AITool[] = [connectObjectsTool, disconnectObjectsTool];
