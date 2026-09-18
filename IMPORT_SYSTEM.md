# IMPORT SYSTEM

Real `.glb`/`.gltf`/`.obj`/`.stl` import via `three`'s own loaders (`three/examples/jsm/loaders/{GLTFLoader,OBJLoader,STLLoader}.js`) — no server-side conversion, no fabricated geometry.

## Flow

```
Header "Import Model" → pickFile('.glb,.gltf,.obj,.stl')
  → ModelImporter.importModelFile(file)      — extension-keyed dispatch to an adapter
      → GltfImportAdapter / ObjImportAdapter / StlImportAdapter
          → parses the file, walks the resulting node tree
          → decomposes each node's local matrix via TransformMath.decomposeMatrix() (never re-derived)
          → builds AssetRecord/MaterialDefinition/SceneObject literals with pre-assigned ids
              (a pure builder — no live manager is touched yet)
  → App.importModel() wraps the result in ImportCommand, runs it through HistoryManager.execute()
```

## Per-format adapters (`src/3d/import/`)

- **`GltfImportAdapter.ts`** — `GLTFLoader.parse()`. Identity-keyed `Map`s dedup shared `THREE.Material`/`THREE.BufferGeometry` instances (GLTFLoader reuses them across nodes referencing the same glTF index), so one shared glTF material becomes one `MaterialDefinition`, not N duplicates. A best-effort duck-typed PBR→`MaterialDefinition` mapping — `preset` is always `'custom'`, never a fabricated match to metal/plastic/etc. Draco/KTX2/external-URI `.gltf` are honest out-of-scope failures (the loader's own error surfaces as an `ImportError`), never silently mishandled.
- **`ObjImportAdapter.ts`** — `OBJLoader().parse(text)` after `TextDecoder`. One shared default `custom` material for the whole file (OBJ alone carries no PBR data).
- **`StlImportAdapter.ts`** — STL has no hierarchy or names at all, so this builds a single root `SceneObject`/`AssetRecord`/`MaterialDefinition` directly; the object's name is the source filename.

`ImportShared.ts` holds the format-agnostic pieces: `buildSceneObjectTree()` (push-before-recurse, back-fills `children`, stamps `metadata.origin:'import'`, and promotes a single childless child straight to root rather than wrapping it in a pointless group), `toGeometryAssetRecord()`/`defaultCustomMaterial()` (pure literal builders with caller-generated ids — see ARCHITECTURE.md's "Assets" section for why these can't call the live `AssetManager`/`MaterialManager` directly).

## `ImportCommand`

Owns both the `SceneObject` tree and its `AssetRecord`/`MaterialDefinition` lifecycle together: `execute()` inserts assets, then materials, then objects parents-first (order matters — see ARCHITECTURE.md's asset-insertion-ordering invariant); `undo()` reverses all three. `structuredClone`s everything before insert, so a second `execute()` (redo) reuses the same ids rather than minting fresh ones.

## Error handling

An unsupported extension is rejected before any loader runs. A malformed/corrupt file, or a Draco/KTX2/unresolvable-external-ref glTF, becomes one honest `ImportError` naming the file — no partial or ghost objects are ever committed, and `history.execute()` is never reached on failure. Cancelling the file picker is a silent no-op (no error, no progress flicker). There is no fake progress percentage: `AppState.importing` is a real indeterminate flag gated on the actual parse promise, since the file is already fully read locally and there is no finer-grained signal to show honestly.

## What imported objects can do

Once committed, an imported object is an ordinary `SceneObject` (`metadata.origin: 'import'`) — transform, mirror, Join/Separate, save/reload, export, and AI commands all work on it exactly like a primitive. See ARCHITECTURE.md's geometry-editing boundary section for the one thing that *doesn't* work yet: vertex/face/edge editing of the imported mesh itself.
