import type { ModelSource } from '../ModelSource';

/** Link-out only, per project policy: no scraping, no fabricated search results, no
 * auto-download. `search`/`details`/`directImport` are deliberately omitted from `capabilities`
 * (and the interface) rather than stubbed, so the UI never offers a capability this source
 * doesn't really have. */
export const printablesSource: ModelSource = {
  id: 'printables',
  name: 'Printables',
  capabilities: { search: false, details: false, directImport: false },
  openSourceUrl(query) {
    const base = 'https://www.printables.com/search/models';
    return query?.trim() ? `${base}?q=${encodeURIComponent(query.trim())}` : base;
  },
};
