import type { Bot, BotExecuteResult } from './Bot';
import type { ObjectManager } from '../core/ObjectManager';
import { createStandardBots } from './bots';

export class BotManager {
  private bots: Bot[];

  constructor(objects: ObjectManager) {
    this.bots = createStandardBots(objects);
  }

  list(): Bot[] {
    return this.bots;
  }

  get(id: string): Bot | undefined {
    return this.bots.find((b) => b.id === id);
  }

  execute(botId: string, args: Record<string, unknown> = {}): BotExecuteResult {
    const bot = this.get(botId);
    if (!bot) return { status: 'not_implemented', message: `Unknown bot: ${botId}` };
    const validation = bot.validate(args);
    if (!validation.valid) return { status: 'not_implemented', message: validation.errors.join(' ') };
    return bot.execute(args);
  }
}
