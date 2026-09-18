import type { AITool, ToolContext } from '../types';
import type { Command } from '../../editor/commands/Command';
import { AnalysisEngine } from '../AnalysisEngine';
import { suggestComponents } from '../ComponentSuggestions';
import { generateConstructionPlan } from '../ConstructionPlan';

/** No-op Command: read-only tools have nothing to mutate/undo, but still flow through the same
 * Parse→Validate→Permission→Preview→Execute pipeline and get a normal activity-log entry. */
class NoOpCommand implements Command {
  constructor(private label: string) {}
  execute(): void {}
  undo(): void {}
  describe(): string { return this.label; }
}

export const inspectObjectTool: AITool = {
  name: 'inspect_object',
  description: 'Reports an object’s current transform, material, and hierarchy info (read-only).',
  destructive: false,
  validate(args, ctx) {
    const errors: string[] = [];
    if (typeof args.objectId !== 'string' || !ctx.objects.get(args.objectId)) errors.push('No matching object was found.');
    return { valid: !errors.length, errors };
  },
  preview(args, ctx) {
    const obj = ctx.objects.getOrThrow(args.objectId as string);
    const mat = obj.material ? ctx.materials.get(obj.material) : undefined;
    return {
      operation: 'INSPECT',
      targets: [{ id: obj.id, name: obj.name }],
      changes: [
        { field: 'position', before: '', after: `[${obj.position.map((n) => n.toFixed(2)).join(', ')}]` },
        { field: 'scale', before: '', after: `[${obj.scale.map((n) => n.toFixed(2)).join(', ')}]` },
        { field: 'material', before: '', after: mat?.name ?? 'none' },
        { field: 'children', before: '', after: String(obj.children.length) },
      ],
      affectedCount: 0,
      summary: `${obj.name}: ${obj.type}, ${obj.children.length} child(ren), material ${mat?.name ?? 'none'}.`,
    };
  },
  buildCommand(args, ctx) {
    return new NoOpCommand(`Inspected ${ctx.objects.get(args.objectId as string)?.name ?? args.objectId}`);
  },
};

export const analyzeSceneTool: AITool = {
  name: 'analyze_scene',
  description: 'Runs the full scene analysis (piece count, symmetry, orphans, warnings) — read-only.',
  destructive: false,
  validate(): ReturnType<AITool['validate']> {
    return { valid: true, errors: [] };
  },
  preview(_args, ctx: ToolContext) {
    const summary = new AnalysisEngine(ctx.objects, ctx.assembly, ctx.coords).summarize();
    return { operation: 'ANALYZE', targets: [], changes: [], affectedCount: 0, summary };
  },
  buildCommand() {
    return new NoOpCommand('Analyzed scene');
  },
};

export const suggestComponentsTool: AITool = {
  name: 'suggest_components',
  description: 'Suggests real, scene-derived gaps (unpaired mirrors, disconnected pieces) — read-only.',
  destructive: false,
  validate(): ReturnType<AITool['validate']> {
    return { valid: true, errors: [] };
  },
  preview(_args, ctx: ToolContext) {
    const suggestions = suggestComponents(ctx.objects, ctx.assembly);
    return {
      operation: 'SUGGEST_COMPONENTS',
      targets: suggestions.flatMap((s) => s.relatedObjectIds).map((id) => ({ id, name: ctx.objects.get(id)?.name ?? id })),
      changes: [],
      affectedCount: 0,
      summary: suggestions.map((s) => `[${s.kind}] ${s.message}`).join(' '),
    };
  },
  buildCommand() {
    return new NoOpCommand('Suggested components');
  },
};

export const generateConstructionPlanTool: AITool = {
  name: 'generate_construction_plan',
  description: 'Generates a real, computed build order from the current hierarchy and assembly connections — read-only.',
  destructive: false,
  validate(): ReturnType<AITool['validate']> {
    return { valid: true, errors: [] };
  },
  preview(_args, ctx: ToolContext) {
    const steps = generateConstructionPlan(ctx.objects, ctx.assembly);
    return {
      operation: 'GENERATE_CONSTRUCTION_PLAN',
      targets: steps.map((s) => ({ id: s.objectId, name: s.objectName })),
      changes: [],
      affectedCount: steps.length,
      summary: steps.length ? steps.map((s) => `${s.order}. ${s.detail}`).join(' ') : 'No mesh objects to plan yet.',
    };
  },
  buildCommand() {
    return new NoOpCommand('Generated construction plan');
  },
};

export const analysisTools: AITool[] = [inspectObjectTool, analyzeSceneTool, suggestComponentsTool, generateConstructionPlanTool];
