import type { ModelSource } from '../ModelSource';

/** Link-out only — see PrintablesSource.ts for the rationale. */
export const thingiverseSource: ModelSource = {
  id: 'thingiverse',
  name: 'Thingiverse',
  capabilities: { search: false, details: false, directImport: false },
  openSourceUrl(query) {
    const base = 'https://www.thingiverse.com/search';
    return query?.trim() ? `${base}?q=${encodeURIComponent(query.trim())}` : base;
  },
};
