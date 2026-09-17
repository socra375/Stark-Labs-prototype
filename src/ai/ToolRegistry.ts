import type { AITool } from './types';
import { objectTools } from './tools/objectTools';
import { materialTools } from './tools/materialTools';
import { assemblyTools } from './tools/assemblyTools';
import { analysisTools } from './tools/analysisTools';
import { versionTools } from './tools/versionTools';

/** Registers all 17 AI tools (create/delete/duplicate/rename/move/rotate/scale_object,
 * group/ungroup_objects, mirror_object, change_material, connect/disconnect_objects,
 * inspect_object, analyze_scene, create/restore_version). */
export class ToolRegistry {
  private tools = new Map<string, AITool>();

  constructor() {
    for (const tool of [...objectTools, ...materialTools, ...assemblyTools, ...analysisTools, ...versionTools]) {
      this.tools.set(tool.name, tool);
    }
  }

  get(name: string): AITool | undefined {
    return this.tools.get(name);
  }

  getAll(): AITool[] {
    return [...this.tools.values()];
  }
}
