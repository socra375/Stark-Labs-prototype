export interface BotValidation {
  valid: boolean;
  errors: string[];
}

export interface BotReport {
  id: string;
  name: string;
  status: 'coming_soon';
  capabilities: string[];
}

export interface BotExecuteResult {
  status: 'not_implemented';
  message: string;
}

/** A future specialized automation agent operating on the scene through the same tool/command
 * surface as the AI layer. execute() is real code (not decorative) — it validates its args for
 * real and returns an honest not-implemented result; it never fabricates a repair/transform/
 * union/construction outcome. */
export interface Bot {
  readonly id: string;
  readonly name: string;
  readonly capabilities: string[];
  validate(args: Record<string, unknown>): BotValidation;
  execute(args: Record<string, unknown>): BotExecuteResult;
  report(): BotReport;
}
