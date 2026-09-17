import type { ToolRegistry } from './ToolRegistry';
import type { PermissionResult } from './types';

/** Flags destructive tool calls as requiring explicit user confirmation before Execute runs.
 * There's no multi-user role system in this app, so "allowed" is always true here — the gate
 * that matters is requiresConfirmation, which AICommandExecutor enforces before mutating. */
export class PermissionValidator {
  constructor(private registry: ToolRegistry) {}

  check(toolName: string): PermissionResult {
    const tool = this.registry.get(toolName);
    if (!tool) return { allowed: false, reason: 'Unknown tool.', requiresConfirmation: false };
    return { allowed: true, requiresConfirmation: tool.destructive };
  }
}
