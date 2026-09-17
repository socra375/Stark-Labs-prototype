import type { ObjectManager } from '../core/ObjectManager';
import type { SceneObject } from '../core/types';
import type { ToolCallCandidate } from './types';

/**
 * Resolves the free-text object references a provider emits (`targetName` / `targetQuery`)
 * against the live ObjectManager into concrete objectId(s), before a candidate ever reaches
 * ToolValidator. Providers (Mock today, Gemini later) never see or invent ids directly.
 */
export class ToolParser {
  constructor(private objects: ObjectManager) {}

  /** Finds the single best-matching object for a name/phrase (exact name match first, then substring). */
  resolveSingle(query: string): SceneObject | null {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const all = this.objects.getAll();
    const exact = all.find((o) => o.name.toLowerCase() === q);
    if (exact) return exact;
    const substring = all.filter((o) => o.name.toLowerCase().includes(q));
    if (substring.length === 1) return substring[0];
    if (substring.length > 1) return substring.sort((a, b) => a.name.length - b.name.length)[0];
    return null;
  }

  /**
   * Finds every object matching a group phrase like "both arms" / "all wheels" / "the legs".
   * Tries the most specific signal first and stops there, rather than unioning every tier:
   * a plain substring match ("arm" inside "Upperarm"/"Forearm") would otherwise also catch the
   * children of an already-matched Arm_L/Arm_R group, double-applying the operation to them
   * (their scale/rotation already inherits from the matched parent's transform).
   */
  resolveMultiple(query: string): SceneObject[] {
    const stripped = query
      .trim()
      .toLowerCase()
      .replace(/^(both|all|the)\s+/, '')
      .replace(/s$/, ''); // naive singularize: "arms" -> "arm", "wheels" -> "wheel"
    if (!stripped) return [];
    const all = this.objects.getAll();
    const byRole = all.filter((o) => typeof o.metadata.role === 'string' && o.metadata.role.toLowerCase() === stripped);
    if (byRole.length) return byRole;
    const byGroup = all.filter((o) => typeof o.metadata.symmetryGroup === 'string' && o.metadata.symmetryGroup.toLowerCase() === stripped);
    if (byGroup.length) return byGroup;
    const bySubstring = all.filter((o) => o.name.toLowerCase().includes(stripped));
    // Drop any match that's a descendant of another match — the ancestor's transform already covers it.
    return bySubstring.filter((o) => !this.objects.getAncestors(o.id).some((a) => bySubstring.includes(a)));
  }

  /** Resolves `targetName`/`targetQuery`/`targetNameA`/`targetNameB`/`targetNames` on a raw
   * candidate into `objectId`/`objectIds`/`objectIdA`/`objectIdB`/`objectIds`. */
  resolve(candidate: ToolCallCandidate): ToolCallCandidate {
    const args = { ...candidate.args };
    if (typeof args.targetName === 'string') {
      const match = this.resolveSingle(args.targetName);
      args.objectId = match?.id ?? null;
      delete args.targetName;
    }
    if (typeof args.targetQuery === 'string') {
      const matches = this.resolveMultiple(args.targetQuery);
      args.objectIds = matches.map((m) => m.id);
      delete args.targetQuery;
    }
    if (typeof args.targetNameA === 'string') {
      args.objectIdA = this.resolveSingle(args.targetNameA)?.id ?? null;
      delete args.targetNameA;
    }
    if (typeof args.targetNameB === 'string') {
      args.objectIdB = this.resolveSingle(args.targetNameB)?.id ?? null;
      delete args.targetNameB;
    }
    if (Array.isArray(args.targetNames)) {
      args.objectIds = (args.targetNames as string[]).map((n) => this.resolveSingle(n)?.id).filter((id): id is string => !!id);
      delete args.targetNames;
    }
    return { ...candidate, args };
  }
}
