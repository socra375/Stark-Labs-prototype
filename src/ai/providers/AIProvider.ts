import type { ToolCallCandidate } from '../types';

export interface AIInterpretResult {
  candidates: ToolCallCandidate[];
  /** Shown to the user alongside/instead of a proposal — e.g. "I didn't understand that." */
  message?: string;
}

export interface AIProvider {
  readonly id: string;
  readonly label: string;
  readonly available: boolean;
  interpret(text: string): Promise<AIInterpretResult>;
}
