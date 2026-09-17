import type { ToolRegistry } from './ToolRegistry';
import type { ToolParser } from './ToolParser';
import type { ToolValidator } from './ToolValidator';
import type { PermissionValidator } from './PermissionValidator';
import type { PreviewGenerator } from './PreviewGenerator';
import type { AIProposal, ToolCallCandidate, ToolContext } from './types';
import type { ObjectManager } from '../core/ObjectManager';
import type { MaterialManager } from '../3d/MaterialManager';
import type { AssemblyManager } from '../editor/AssemblyManager';
import type { CoordinateSystem } from '../3d/CoordinateSystem';
import type { MirrorTool } from '../editor/MirrorTool';
import type { GroupingManager } from '../editor/GroupingManager';
import type { HistoryManager } from '../editor/HistoryManager';
import type { VersionRepository } from '../storage/VersionRepository';
import type { LiveScene } from '../storage/ProjectRepository';

export type PreparedAction =
  | { ok: true; candidate: ToolCallCandidate; proposal: AIProposal; requiresConfirmation: boolean; ctx: ToolContext }
  | { ok: false; error: string };

export interface ExecutorDeps {
  objects: ObjectManager;
  materials: MaterialManager;
  assembly: AssemblyManager;
  coords: CoordinateSystem;
  mirror: MirrorTool;
  grouping: GroupingManager;
  history: HistoryManager;
  versionRepo: VersionRepository;
  scene: LiveScene;
}

/**
 * The AI safety pipeline: Parse -> Schema Validate -> Permission -> Preview -> (user confirms
 * if flagged) -> Execute. Free text from a provider NEVER reaches ObjectManager/MaterialManager/
 * AssemblyManager directly — every path runs through here, and `apply()` is the only place that
 * actually mutates state, always through HistoryManager so AI actions are undoable like manual
 * edits.
 */
export class AICommandExecutor {
  constructor(
    private registry: ToolRegistry,
    private parser: ToolParser,
    private validator: ToolValidator,
    private permission: PermissionValidator,
    private preview: PreviewGenerator,
    private deps: ExecutorDeps,
  ) {}

  async prepare(rawCandidate: ToolCallCandidate): Promise<PreparedAction> {
    const tool = this.registry.get(rawCandidate.toolName);
    if (!tool) return { ok: false, error: `Unknown tool: ${rawCandidate.toolName}` };

    const candidate = this.parser.resolve(rawCandidate);
    const projectId = this.deps.scene.state.currentProject.get()?.id;
    const versions = projectId ? await this.deps.versionRepo.list(projectId) : [];
    const ctx: ToolContext = { ...this.deps, versions };

    const validation = this.validator.validate(candidate, ctx);
    if (!validation.valid) return { ok: false, error: validation.errors.join(' ') };

    const permission = this.permission.check(candidate.toolName);
    if (!permission.allowed) return { ok: false, error: permission.reason ?? 'Not permitted.' };

    const proposal = this.preview.generate(candidate, ctx);
    return { ok: true, candidate, proposal, requiresConfirmation: permission.requiresConfirmation, ctx };
  }

  /** Actually mutates state. Only call this after the user has confirmed, for actions where
   * `requiresConfirmation` was true; for non-destructive actions the caller may apply immediately. */
  apply(prepared: Extract<PreparedAction, { ok: true }>): void {
    const tool = this.registry.get(prepared.candidate.toolName)!;
    const commands = tool.buildCommand(prepared.candidate.args, prepared.ctx);
    for (const cmd of Array.isArray(commands) ? commands : [commands]) {
      this.deps.history.execute(cmd);
    }
  }
}
