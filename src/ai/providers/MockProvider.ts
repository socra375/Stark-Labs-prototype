import type { AIProvider, AIInterpretResult } from './AIProvider';
import type { ToolCallCandidate } from '../types';
import { GEOMETRY_TYPES } from '../../3d/GeometryFactory';

type Rule = { pattern: RegExp; build: (m: RegExpMatchArray) => ToolCallCandidate['args'] & { toolName: string } };

const GEOM = GEOMETRY_TYPES.join('|');

// A plain regex alternation can't cleanly express multi-word phrasing ("carbon fiber"), so the
// pattern below matches the whole phrase and this table normalizes it to the real preset key.
const MATERIAL_PHRASES: Record<string, string> = {
  metal: 'metal', plastic: 'plastic', glass: 'glass', fiber: 'fiber',
  titanium: 'titanium', rubber: 'rubber', gold: 'gold',
  'carbon fiber': 'carbonFiber', carbonfiber: 'carbonFiber',
  'red metal': 'redMetal', redmetal: 'redMetal',
  'blue metal': 'blueMetal', bluemetal: 'blueMetal',
};
const MATERIAL_PHRASE_PATTERN = Object.keys(MATERIAL_PHRASES).sort((a, b) => b.length - a.length).join('|');

const RULES: Rule[] = [
  { pattern: new RegExp(`^create\\s+(?:a\\s+)?(${GEOM})(?:\\s+named\\s+(.+))?$`, 'i'), build: (m) => ({ toolName: 'create_object', geometryType: m[1].toLowerCase(), name: m[2]?.trim() || m[1] }) },
  { pattern: /^delete\s+(?:the\s+)?(.+)$/i, build: (m) => ({ toolName: 'delete_object', targetName: m[1].trim() }) },
  { pattern: /^duplicate\s+(?:the\s+)?(.+)$/i, build: (m) => ({ toolName: 'duplicate_object', targetName: m[1].trim() }) },
  { pattern: /^rename\s+(?:the\s+)?(.+?)\s+to\s+(.+)$/i, build: (m) => ({ toolName: 'rename_object', targetName: m[1].trim(), name: m[2].trim() }) },
  { pattern: /^move\s+(?:the\s+)?(.+?)\s+to\s+(-?[\d.]+)[,\s]+(-?[\d.]+)[,\s]+(-?[\d.]+)$/i, build: (m) => ({ toolName: 'move_object', targetName: m[1].trim(), position: [parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4])] }) },
  { pattern: /^rotate\s+(?:the\s+)?(.+?)\s+to\s+(-?[\d.]+)[,\s]+(-?[\d.]+)[,\s]+(-?[\d.]+)$/i, build: (m) => ({ toolName: 'rotate_object', targetName: m[1].trim(), rotationDeg: [parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4])] }) },
  {
    pattern: /^scale\s+(both\s+|all\s+)?(?:the\s+)?(.+?)\s+(?:by\s+)?(-?[\d.]+)\s*%$/i,
    build: (m) => {
      const factor = 1 + parseFloat(m[3]) / 100;
      return m[1] ? { toolName: 'scale_object', targetQuery: `${m[1]}${m[2]}`.trim(), factor } : { toolName: 'scale_object', targetName: m[2].trim(), factor };
    },
  },
  { pattern: /^group\s+(.+?)\s+and\s+(.+)$/i, build: (m) => ({ toolName: 'group_objects', targetNames: [m[1].trim(), m[2].trim()] }) },
  { pattern: /^ungroup\s+(?:the\s+)?(.+)$/i, build: (m) => ({ toolName: 'ungroup_objects', targetName: m[1].trim() }) },
  { pattern: /^mirror\s+(?:the\s+)?(.+?)\s+(?:across|on)\s+(x|y|z)$/i, build: (m) => ({ toolName: 'mirror_object', targetName: m[1].trim(), axis: m[2].toLowerCase() }) },
  { pattern: new RegExp(`^(?:change|set)\\s+(?:the\\s+)?material\\s+(?:of\\s+)?(.+?)\\s+to\\s+(${MATERIAL_PHRASE_PATTERN})$`, 'i'), build: (m) => ({ toolName: 'change_material', targetName: m[1].trim(), preset: MATERIAL_PHRASES[m[2].toLowerCase()] }) },
  { pattern: /^connect\s+(.+?)\s+(?:and|to)\s+(.+)$/i, build: (m) => ({ toolName: 'connect_objects', targetNameA: m[1].trim(), targetNameB: m[2].trim() }) },
  { pattern: /^disconnect\s+(.+?)\s+(?:and|from)\s+(.+)$/i, build: (m) => ({ toolName: 'disconnect_objects', targetNameA: m[1].trim(), targetNameB: m[2].trim() }) },
  { pattern: /^inspect\s+(?:the\s+)?(.+)$/i, build: (m) => ({ toolName: 'inspect_object', targetName: m[1].trim() }) },
  { pattern: /^analyz[e]\s*(?:the\s+scene)?$/i, build: () => ({ toolName: 'analyze_scene' }) },
  { pattern: /^(?:create|save)\s+(?:a\s+)?version(?:\s+(?:named|called)\s+(.+))?$/i, build: (m) => ({ toolName: 'create_version', name: m[1]?.trim() || `v-${new Date().toLocaleTimeString()}` }) },
  { pattern: /^restore\s+(?:version\s+)?(.+)$/i, build: (m) => ({ toolName: 'restore_version', name: m[1].trim() }) },
];

/**
 * Deterministic, rule-based natural-language-to-tool-call interpreter — the default, always-
 * available provider. It runs the REAL tool pipeline end to end (this is not a canned-text
 * demo), but its "understanding" is keyword/regex matching, not a language model — every
 * response is labeled [MOCK] so it's never mistaken for live Gemini output.
 */
export class MockProvider implements AIProvider {
  readonly id = 'mock';
  readonly label = 'Mock (offline, rule-based)';
  readonly available = true;

  async interpret(text: string): Promise<AIInterpretResult> {
    const trimmed = text.trim().replace(/\.+$/, '');
    for (const rule of RULES) {
      const m = trimmed.match(rule.pattern);
      if (m) {
        const { toolName, ...args } = rule.build(m);
        return { candidates: [{ toolName, args, rawText: text }] };
      }
    }
    return {
      candidates: [],
      message:
        "[MOCK] I couldn't match that to a known command. Try things like: \"create a box\", " +
        '"delete the torso", "scale both arms by 10%", "mirror arm_l across x", "connect torso and arm_l", or "analyze the scene".',
    };
  }
}
