/** An external model source this app can only link out to — never scrape, never fabricate search
 * results, never bypass access controls. `openSourceUrl` is the one capability every source
 * guarantees; `search`/`details`/`directImport` are opt-in and only present when `capabilities`
 * says so, so the UI never renders a search box or result list a source can't actually back. */
export interface ModelSourceResult {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
}

export interface ModelSource {
  readonly id: string;
  readonly name: string;
  readonly capabilities: { search: boolean; details: boolean; directImport: boolean };
  openSourceUrl(query?: string): string;
  search?(query: string): Promise<ModelSourceResult[]>;
}
