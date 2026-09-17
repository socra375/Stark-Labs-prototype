import type { AIProvider, AIInterpretResult } from './providers/AIProvider';
import { MockProvider } from './providers/MockProvider';
import { GeminiProvider } from './providers/GeminiProvider';

/** Facade over the active AI provider. Gemini is registered but not selectable until a real
 * secure backend exists (see GeminiProvider) — `setActive('gemini')` is refused. */
export class AIService {
  private providers: Map<string, AIProvider>;
  private activeId = 'mock';

  constructor() {
    const mock = new MockProvider();
    const gemini = new GeminiProvider();
    this.providers = new Map<string, AIProvider>([
      [mock.id, mock],
      [gemini.id, gemini],
    ]);
  }

  get active(): AIProvider {
    return this.providers.get(this.activeId)!;
  }

  listProviders(): AIProvider[] {
    return [...this.providers.values()];
  }

  setActive(id: string): boolean {
    const provider = this.providers.get(id);
    if (!provider || !provider.available) return false;
    this.activeId = id;
    return true;
  }

  interpret(text: string): Promise<AIInterpretResult> {
    return this.active.interpret(text);
  }
}
