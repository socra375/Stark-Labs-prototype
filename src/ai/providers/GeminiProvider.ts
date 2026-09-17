import type { AIProvider, AIInterpretResult } from './AIProvider';

/**
 * Staged rollout (per project decision, not to be changed without the user asking):
 * Stage 1 (shipped): MockProvider is the default, fully-functional provider.
 * Stage 2 (this class, shipped but disabled): GeminiProvider is written and registered in
 *   AIService, but never selectable — `available` is always false and `interpret()` refuses.
 *   It never embeds an API key; it is written to call a backend/proxy endpoint that does not
 *   exist in this project yet. No local Express/proxy stand-in is built to fake that endpoint.
 * Stage 3 (future, out of scope here): once a real secure endpoint exists
 *   (Frontend -> secure API endpoint -> Gemini), swap `endpointUrl` in and flip `available`.
 */
export class GeminiProvider implements AIProvider {
  readonly id = 'gemini';
  readonly label = 'Gemini (not configured)';
  readonly available = false;

  constructor(private endpointUrl: string | null = null) {}

  async interpret(_text: string): Promise<AIInterpretResult> {
    if (!this.endpointUrl) {
      return { candidates: [], message: 'Gemini is not configured in this deployment. No API key is present in the frontend, and no secure backend endpoint has been set up yet. Using the offline Mock provider instead.' };
    }
    // Intentionally unimplemented: when a real secure endpoint exists, this fetches it and
    // maps its structured tool-call response into ToolCallCandidate[] — it still never lets
    // free text mutate state directly; it would feed straight into the same ToolParser/
    // ToolValidator/PermissionValidator/PreviewGenerator pipeline as MockProvider.
    throw new Error('GeminiProvider.interpret() is not implemented — Stage 3 of the AI rollout.');
  }
}
