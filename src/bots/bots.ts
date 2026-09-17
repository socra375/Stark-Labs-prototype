import type { Bot, BotValidation, BotExecuteResult, BotReport } from './Bot';
import type { ObjectManager } from '../core/ObjectManager';

/** Shared skeleton for the 6 future bots: validate()/report() are real (they actually check the
 * live scene), execute() is honestly unimplemented — never a fabricated repair/union/etc. result. */
function createBot(id: string, name: string, capabilities: string[], objects: ObjectManager): Bot {
  return {
    id,
    name,
    capabilities,
    validate(args): BotValidation {
      const errors: string[] = [];
      if ('objectId' in args) {
        if (typeof args.objectId !== 'string' || !objects.get(args.objectId)) errors.push(`objectId does not reference an existing object.`);
      }
      return { valid: !errors.length, errors };
    },
    execute(): BotExecuteResult {
      return { status: 'not_implemented', message: `${name} is not implemented yet. Capabilities planned: ${capabilities.join(', ')}.` };
    },
    report(): BotReport {
      return { id, name, status: 'coming_soon', capabilities };
    },
  };
}

export function createStandardBots(objects: ObjectManager): Bot[] {
  return [
    createBot('repair', 'RepairBot', ['detect broken/disconnected assemblies', 'propose a fix connection'], objects),
    createBot('transformer', 'TransformerBot', ['reconfigure a prototype between stored layouts'], objects),
    createBot('union', 'UnionBot', ['merge overlapping/adjacent pieces into one'], objects),
    createBot('construction', 'ConstructionBot', ['build a component subtree from a spec'], objects),
    createBot('material', 'MaterialBot', ['batch-apply a material preset across a selection'], objects),
    createBot('scanner', 'ScannerBot', ['image/silhouette → geometry (future image-to-3D pipeline)'], objects),
  ];
}
