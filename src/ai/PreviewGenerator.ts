import type { ToolRegistry } from './ToolRegistry';
import type { AIProposal, ToolContext, ToolCallCandidate } from './types';

/** Builds the structured, non-mutating AIProposal for a validated candidate. Never touches ObjectManager/MaterialManager/AssemblyManager state. */
export class PreviewGenerator {
  constructor(private registry: ToolRegistry) {}

  generate(candidate: ToolCallCandidate, ctx: ToolContext): AIProposal {
    const tool = this.registry.get(candidate.toolName)!;
    return tool.preview(candidate.args, ctx);
  }
}
