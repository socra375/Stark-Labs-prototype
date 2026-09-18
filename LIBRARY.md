# LIBRARY

Three sections behind one segmented control in `LibraryScreen.ts`: **My Models**, **My Parts**, and **External Sources** (Printables/Thingiverse). The first two are real, Dexie-backed collections; the third is real link-out only — never a fabricated search-result list.

## My Models

Save the entire current scene (`App.saveCurrentSceneAsModel(name)` → `Serializer.capture()`'s full `{components, materials, assemblies, assets}` wrapped as a `SavedModel{kind:'model'}`) to the `models` Dexie table. Browse/search/insert/delete from `LibraryScreen`.

## My Parts

A "Save as Part" action (bottom toolbar, enabled only with a real selection) captures **only what the selection actually uses** — `PartCapture.capturePartSnapshot()` walks the selected subtree(s) and their referenced materials/assets, never the whole scene — with a name and category, saved to the same `models` table with `kind:'part'`. Reuses My Models' insertion pipeline unchanged.

## Insertion: always an independent copy

Both tabs insert through the same `InsertLibraryItemCommand` (`src/editor/commands/InsertLibraryItemCommand.ts`), built from `remapSavedModelForInsertion()` (`src/library/LibraryInsertion.ts`) — a pure function that gives every asset/material/component/connection in the saved snapshot a **fresh id** (the same id-remapping idiom `DuplicateCommand` uses for a single subtree, generalized to a `SavedModel`'s potentially multi-root snapshot), remapping `geometry.assetId`/`material`/`parentId`/`children` through the new-id maps, and dropping any connection whose endpoints didn't survive (defensive; can't happen for a well-formed snapshot).

This guarantees the addendum's explicit requirement: **no two projects, and no two insertions in the same project, ever share a live mutable `SceneObject`/asset/material instance.** Editing one inserted copy never affects the saved library entry, or any other copy already inserted elsewhere. `InsertLibraryItemCommand.execute()`/`undo()` insert/remove assets → materials → components (parents-first) → connections, in that order, matching every other multi-owned-resource Command in this codebase.

## External Sources (M21)

`ModelSource` (`src/library/ModelSource.ts`) is a real adapter interface:

```ts
interface ModelSource {
  readonly id: string;
  readonly name: string;
  readonly capabilities: { search: boolean; details: boolean; directImport: boolean };
  openSourceUrl(query?: string): string;   // the one guaranteed capability
  search?(query: string): Promise<ModelSourceResult[]>;   // omitted entirely when capabilities.search is false
}
```

`PrintablesSource`/`ThingiverseSource` (`src/library/sources/`) implement **only** `openSourceUrl` — `capabilities: {search:false, details:false, directImport:false}` — returning a real search URL on the actual site (`printables.com/search/models?q=...`, `thingiverse.com/search?q=...`). The Library UI shows a `SOURCE: PRINTABLES`/`SOURCE: THINGIVERSE` badge, an explicit note that this app never scrapes or fabricates results, an optional query field, and an "Open Source Page" button that opens the real site in a new tab — nothing resembling a live search-result list, no scraping, no auto-download, no bypassing access controls, no embedding third-party content.

Adding a real search-backed source later means implementing `search()` and flipping `capabilities.search` on a new adapter — the interface already anticipates it — not redesigning the UI.
