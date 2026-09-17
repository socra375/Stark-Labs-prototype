export interface Command {
  /** Human-readable description for the activity log, e.g. "Created Torso". */
  describe(): string;
  execute(): void;
  undo(): void;
}
