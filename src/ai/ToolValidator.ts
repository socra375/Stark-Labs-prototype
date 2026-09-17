import type { ToolRegistry } from './ToolRegistry';
import type { ToolContext, ValidationResult } from './types';
import type { ToolCallCandidate } from './types';

/** Schema/existence validation stage: confirms the tool name is real and its args are well-formed. */
export class ToolValidator {
  constructor(private registry: ToolRegistry) {}

  validate(candidate: ToolCallCandidate, ctx: ToolContext): ValidationResult {
    const tool = this.registry.get(candidate.toolName);
    if (!tool) return { valid: false, errors: [`Unknown tool: ${candidate.toolName}`] };
    return tool.validate(candidate.args, ctx);
  }
}
