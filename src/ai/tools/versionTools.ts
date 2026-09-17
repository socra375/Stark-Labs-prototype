import type { AITool, ToolContext } from '../types';
import type { Command } from '../../editor/commands/Command';
import type { ProjectVersion } from '../../core/types';

function findVersion(args: Record<string, unknown>, ctx: ToolContext): ProjectVersion | undefined {
  if (typeof args.versionId === 'string') return ctx.versions.find((v) => v.id === args.versionId);
  if (typeof args.name === 'string') return ctx.versions.find((v) => v.name.toLowerCase() === (args.name as string).toLowerCase());
  return undefined;
}

/** Fire-and-forget wrapper for the two version tools' async IndexedDB work — Command.execute()
 * is synchronous everywhere else in this app, and versions were already a separate concept
 * from the undo/redo stack (VersionsPanel's buttons call VersionRepository directly too), so
 * kicking the promise off here (logging failures) keeps the pipeline uniform without forcing
 * every other command through an async rewrite for these two. */
class AsyncVersionCommand implements Command {
  constructor(private label: string, private run: () => Promise<void>) {}
  execute(): void { this.run().catch((err) => console.error(`${this.label} failed:`, err)); }
  undo(): void { /* versions are not part of the undo/redo stack; restoring a different version is how you "undo" this. */ }
  describe(): string { return this.label; }
}

export const createVersionTool: AITool = {
  name: 'create_version',
  description: 'Saves the current scene state as a named version.',
  destructive: false,
  validate(args) {
    const errors: string[] = [];
    if (typeof args.name !== 'string' || !args.name.trim()) errors.push('A version name is required.');
    return { valid: !errors.length, errors };
  },
  preview(args) {
    return { operation: 'CREATE_VERSION', targets: [], changes: [{ field: 'version', before: '—', after: String(args.name) }], affectedCount: 0, summary: `Save current state as version "${args.name}".` };
  },
  buildCommand(args, ctx) {
    return new AsyncVersionCommand(`Created version ${args.name}`, () => ctx.versionRepo.create(ctx.scene, String(args.name)).then(() => {}));
  },
};

export const restoreVersionTool: AITool = {
  name: 'restore_version',
  description: 'Replaces the current scene with a previously saved version.',
  destructive: true,
  validate(args, ctx) {
    const errors: string[] = [];
    if (!findVersion(args, ctx)) errors.push('No matching version was found.');
    return { valid: !errors.length, errors };
  },
  preview(args, ctx) {
    const version = findVersion(args, ctx)!;
    return { operation: 'RESTORE_VERSION', targets: [], changes: [{ field: 'scene', before: 'current state', after: `version "${version.name}"` }], affectedCount: version.snapshot.components.length, summary: `Restore version "${version.name}", replacing the current scene.` };
  },
  buildCommand(args, ctx) {
    const version = findVersion(args, ctx)!;
    return new AsyncVersionCommand(`Restored version ${version.name}`, () => ctx.versionRepo.restore(ctx.scene, version));
  },
};

export const versionTools: AITool[] = [createVersionTool, restoreVersionTool];
