/** Every simulation module returns this shape instead of fabricated numbers — there is no
 * physics/structural solver behind this yet, and the UI must never imply there is one. */
export interface NotImplementedResult {
  status: 'not_implemented';
  module: string;
  message: string;
}

export interface SimulationModule {
  readonly name: string;
  execute(): NotImplementedResult;
}
