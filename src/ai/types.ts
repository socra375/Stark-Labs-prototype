import type { ObjectManager } from '../core/ObjectManager';
import type { MaterialManager } from '../3d/MaterialManager';
import type { AssemblyManager } from '../editor/AssemblyManager';
import type { CoordinateSystem } from '../3d/CoordinateSystem';
import type { MirrorTool } from '../editor/MirrorTool';
import type { GroupingManager } from '../editor/GroupingManager';
import type { HistoryManager } from '../editor/HistoryManager';
import type { VersionRepository } from '../storage/VersionRepository';
import type { LiveScene } from '../storage/ProjectRepository';
import type { Command } from '../editor/commands/Command';
import type { ProjectVersion } from '../core/types';

/** Everything a tool needs to validate/preview/execute against — the app's live managers. */
export interface ToolContext {
  objects: ObjectManager;
  materials: MaterialManager;
  assembly: AssemblyManager;
  coords: CoordinateSystem;
  mirror: MirrorTool;
  grouping: GroupingManager;
  history: HistoryManager;
  versionRepo: VersionRepository;
  scene: LiveScene;
  /** Current project's versions, fetched once per AICommandExecutor.run() so validate/preview/
   * buildCommand can stay synchronous while still reflecting real, current data. */
  versions: ProjectVersion[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  requiresConfirmation: boolean;
}

export type ProposalFieldChange = { field: string; before: string; after: string };

/** A structured, non-mutating preview of what a tool call would do — rendered as a real
 * proposal card (Target / Operation / Changes / Affected count), never a prose guess. */
export interface AIProposal {
  operation: string;
  targets: { id: string; name: string }[];
  changes: ProposalFieldChange[];
  affectedCount: number;
  summary: string;
}

export interface AITool<Args = Record<string, unknown>> {
  name: string;
  description: string;
  destructive: boolean;
  /** Structural + existence/lock checks combined (this app's tool surface is small enough that
   * splitting "schema shape" from "do the referenced objects exist" into two passes would just
   * be indirection — both still run before any preview or mutation, satisfying the same gate). */
  validate(args: Args, ctx: ToolContext): ValidationResult;
  preview(args: Args, ctx: ToolContext): AIProposal;
  buildCommand(args: Args, ctx: ToolContext): Command | Command[];
}

export interface ToolCallCandidate {
  toolName: string;
  args: Record<string, unknown>;
  rawText: string;
}
