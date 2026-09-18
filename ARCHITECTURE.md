# ARCHITECTURE

## Stack decisions

| Area | Decision | Why |
|---|---|---|
| Build tool | Vite | Zero-config TS/ESM, fast dev server, trivial static build — no backend to orchestrate. |
| Language | TypeScript, strict mode | The data model (object tree, Dexie tables, `.stark` format, 17 AI tool schemas) is complex enough that compile-time checking earns its keep. |
| UI | Vanilla TS + a ~30-line signal/computed/effect store (`src/ui/reactive/Store.ts`) — **no React/Vue** | The editor is fundamentally imperative Three.js scene mutation plus a gizmo↔inspector two-way sync. A signal store gives that without a vdom fighting direct scene mutation, or the weight of a framework the project's own ground rules ask to avoid unless it clearly wins. Revisit if UI state complexity grows enough to justify it. |
| 3D engine | `three` (npm, exact-pinned version) | Required; ESM import avoids CDN version drift. |
| Storage | Dexie 4 over IndexedDB (exact-pinned) | No paid backend allowed. Dexie's schema/index/transaction API is far more tractable than raw `indexedDB` for a relational-ish shape (projects/components/materials/assemblies/versions/history/assets/models/referenceImages). |
| Testing | Vitest + jsdom (exact-pinned) | Same Vite-native toolchain as the app itself; jsdom covers the DOM APIs (`ImageData`, `btoa`/`atob`, `document.createElement`) the pure logic under test touches, without needing a full browser. |

All dependency versions in `package.json` are pinned exactly (no `^`/`~`), with `package-lock.json` committed, so a future `npm install` can't silently pull a breaking change. Bumping a version is a deliberate, reviewed edit.

## Directory layout

```
src/
├── core/        App orchestrator, EventBus, ObjectManager (the object tree), AppState, SceneManager, types
├── 3d/          Renderer/Camera/Controls/Viewport, GeometryFactory, MaterialManager, MeshFactory, AssetManager,
│                SceneSync (model↔Object3D), TransformGizmo, Raycaster, CoordinateSystem, TransformMath,
│                BoundingBox, AssemblyVisualizer, ReferenceImageVisualizer, import/ (ModelImporter + adapters)
├── editor/      SelectionManager, Inspector, ObjectTree, HistoryManager, GroupingManager,
│                GroupTransformPivot, MirrorTool, JoinTool, SeparateTool, AssemblyManager,
│                ReferenceImageManager, VersionDiff, geometry/ (future geometry-edit boundary, stub only),
│                commands/ (Command pattern)
├── storage/     StorageAdapter (interface), Database (Dexie v2 impl), ProjectRepository,
│                VersionRepository, HistoryRepository, ModelLibraryRepository, AutosaveService,
│                Serializer, StarkFileFormat
├── library/     ModelSource adapter interface + sources/ (Printables/Thingiverse, link-out only),
│                LibraryInsertion (fresh-id remapping), PartCapture
├── reconstruction/ Image→3D pipeline: segmentation, depth (chamfer distance transform), mesh
│                (pillow-solid geometry), ReconstructionEngine/Service (mirrors AIProvider/AIService)
├── ai/          AIService, providers/ (Mock, Gemini-disabled), ToolRegistry, tools/, ToolParser,
│                ToolValidator, PermissionValidator, PreviewGenerator, AICommandExecutor, AnalysisEngine,
│                ImageAnalysis, ComponentSuggestions, ConstructionPlan (M22 extension)
├── simulation/  SimulationEngine + modules.ts (stubs)
├── construction/ ConstructionEngine + stages.ts (MODEL/COMPONENTS/VOXELS/LAYERS stubs, real PLAN),
│                ConstructionExport
├── bots/        Bot interface, BotManager, bots.ts (stubs)
├── templates/   TemplateRegistry + blank/humanoid/exosuit/robot/vehicle + shared tree builder
└── ui/          reactive/ (Store, bind), panels/, toolbar/, components/, screens/, styles/
```

### Deviations from the originally sketched layout, and why

- **`src/ai/tools/` has 5 files (objectTools/materialTools/assemblyTools/analysisTools/versionTools), not 19.** Each tool is a full `AITool` object (validate/preview/buildCommand); grouping them by the manager they act on kept related logic and helpers together instead of near-duplicate files each re-importing the same three commands.
- **`src/simulation/modules.ts`, `src/construction/stages.ts`, and `src/bots/bots.ts` are single files, not one-file-per-module/stage/bot.** All 6 simulation modules, the 4 stub construction stages, and separately all 6 bots share one tiny stub factory; splitting each into its own file would have been repeated copies of the same four lines.
- **`src/editor/geometry/` holds interfaces only** (`GeometryEditOperation.ts`) — no implementation exists yet, deliberately, per the addendum's future module-boundary requirement (see "Geometry-editing boundary" below).
- Everything else matches the original sketch (`src/templates/`, `src/bots/` as a sibling of `src/simulation/`, `src/ui/reactive/` for the micro-store, `src/utils/`) for the reasons given when the plan was drafted: bots and simulation are conceptually distinct systems, and template generation is substantial enough to deserve its own module.

## Data flow

### Local vs. world transforms

`SceneObject.position/rotation/scale` are **always local**, relative to `parentId` (or world, if root). Nothing but `CoordinateSystem` (`src/3d/CoordinateSystem.ts`) is allowed to convert between local and world space — it composes/decomposes `THREE.Matrix4`s by walking the ancestor chain. `TransformMath.ts` holds the shared `Matrix4`/`Quaternion` primitives (compose, decompose, reflect-across-plane). Every feature that needs world-space math — Mirror, Group/Ungroup (preserving world pose across reparenting), the multi-select gizmo pivot, `BoundingBox`/`AnalysisEngine` — goes through these two files instead of re-deriving the math locally. This was a deliberate, reviewed decision (see git history): the alternative (each feature doing its own Euler-angle arithmetic) breaks silently on compound rotations.

### Group vs. Assembly/Connect vs. Parent/Child

Three distinct concepts, kept apart on purpose:

- **Parent/Child** — spatial hierarchy (`SceneObject.parentId`/`children`). Moving a parent moves its children.
- **Group** — a real parent `SceneObject` (`type: 'group'`) created by `GroupingManager` purely to transform several existing pieces together. Ungrouping removes that node and reparents children, preserving world pose.
- **Assembly/Connect** — a `Connection` record (`AssemblyManager`), a structural relationship between two objects. It does **not** touch `parentId`; it's independent metadata for the assembly graph, consumed by `AnalysisEngine`'s disconnected-piece check and (later) the bot/simulation layer.

### Model → render sync

`ObjectManager` is the single source of truth (a plain data tree, no Three.js references). `SceneSync` listens to its `EventBus` events (`object:created/updated/removed`, `scene:cleared/loaded`) and mirrors them into live `Object3D` instances under `Viewport`'s scene graph. UI panels never touch `Object3D`s directly; they read/write through `ObjectManager`/`MaterialManager`/`AssemblyManager`, and `SceneSync` (plus `MaterialManager`'s live-material mutation, see below) keeps the render in sync automatically.

### Undo/Redo

`HistoryManager` is a command-pattern stack (`editor/commands/*`). Every mutating action — manual or AI-driven — is wrapped in a `Command` (`execute`/`undo`/`describe`) and pushed through `HistoryManager.execute()`/`.record()`. A gizmo drag is a special case: it applies live during the drag (for immediate visual feedback) and is registered with `HistoryManager.record()` (already-applied, just tracked) on drag end, rather than re-executed.

### Materials are a shared library

`MaterialDefinition`s are referenced by id from `SceneObject.material`, like a Blender/Unity material library — not copied per object. `MaterialManager.update()` mutates the live cached `THREE.MeshStandardMaterial` instance in place (rather than rebuilding a new one) so every object referencing that material updates immediately, including objects the user isn't currently looking at.

### Storage seam

`IStorageAdapter` (`storage/StorageAdapter.ts`) is the only thing `ProjectRepository`/`VersionRepository`/`HistoryRepository` depend on. `Database` (Dexie/IndexedDB) is the sole implementation today; a future remote backend means writing a new adapter, not touching any repository or caller above it.

### AI safety pipeline

See [AI_TOOLS.md](AI_TOOLS.md). The short version: free text never reaches `ObjectManager` directly. It always flows `AIService.interpret()` → `ToolParser.resolve()` (name→id resolution) → `ToolValidator` → `PermissionValidator` → `PreviewGenerator` (a non-mutating structured proposal) → user confirmation for anything destructive → `AICommandExecutor.apply()`, which is the only function that calls `HistoryManager.execute()`.

### Assets: the one place non-parametric geometry lives

`AssetManager` (`src/3d/AssetManager.ts`) owns `AssetRecord` blobs — imported/reconstructed geometry, source files, source images — the same CRUD/live-cache discipline as `MaterialManager`. `SceneObject.geometry:{type:'imported', assetId}` is the one representation every non-primitive mesh uses: `GeometryFactory` resolves it via `assets.getGeometry(assetId)`, which always hands back a fresh `.clone()` so no two meshes ever share a mutable geometry instance. **A load-bearing ordering invariant**: `ObjectManager.insert()` fires `object:created` synchronously, and `SceneSync.mount()` resolves the object's geometry/material asset immediately off that same event — so any code inserting an `imported`-geometry object must insert its `AssetRecord` (and material) *before* inserting the object, in both a Command's `execute()` and `undo()`. Import, Image→3D commit, Library insertion, and Join/Separate all follow this.

**Pure builder, live-manager-mutation-inside-Command**: every one of those features builds its `AssetRecord`/`SceneObject`/`MaterialDefinition` as plain literals with a pre-assigned id (`toGeometryAssetRecord()` etc. in `src/3d/import/ImportShared.ts`) *before* any `Command` exists, then the `Command`'s `execute()` calls `assets.insert()`/`objects.insert()`/`materials.insert()` with those literals. This is what makes redo safe — a second `execute()` reuses the exact same ids rather than minting fresh ones, unlike `AssetManager.insertGeometry()`/`MaterialManager.createPreset()`, which are live-mutating convenience methods never called by a `Command` directly.

### Import and Image→3D reconstruction

See [IMPORT_SYSTEM.md](IMPORT_SYSTEM.md) and [IMAGE_TO_3D.md](IMAGE_TO_3D.md). Both land as ordinary `SceneObject`s (`metadata.origin: 'import'` / `'reconstruction'`) that transform/mirror/join/separate/save/export exactly like a primitive from the moment they're committed — reconstruction results are never a special read-only type. Image→3D's reconstruction is a deterministic `<canvas>` pipeline (`src/reconstruction/`), never a fabricated ML result, and its output geometry/UI is always labeled ESTIMATED.

### ReferenceImage: deliberately not a SceneObject

Image→Build's reference photo (`ReferenceImage`, `src/editor/ReferenceImageManager.ts`) is a parallel, per-project collection with its own manager/visualizer/Commands — never inserted into `ObjectManager`. It never appears in Join/Separate/Mirror/`AnalysisEngine`, by design. Its `rotation` is a `Quat` (`[x,y,z,w]`), applied directly to the plane mesh's `THREE.Object3D.quaternion` — unlike every `SceneObject.rotation` (a stored local Euler `Vec3`) — because a reference plane needs free 3D rotation with no gimbal lock. Selection is kept mutually exclusive with `SceneObject` selection via two cross-subscriptions on `AppState.selection`/`selectedReferenceImageId`.

### Join/Separate

`JoinTool`/`SeparateTool` (`src/editor/{JoinTool,SeparateTool}.ts`) mirror `MirrorTool`'s plan-then-Command shape. Join bakes each selected mesh's world matrix into a geometry clone (via `CoordinateSystem`, never re-derived) and merges them with `BufferGeometryUtils.mergeGeometries` — which returns `null` (not a throw) on incompatible attribute sets, so callers must check for it despite the `.d.ts` claiming a non-nullable return. `metadata.joinedFrom` keeps deep clones of the originals so Separate can reverse a Join losslessly with zero geometry analysis; otherwise Separate falls back to a real triangle-adjacency **and position-based** union-find (most geometry generators duplicate vertices per-face for correct normals, so adjacent faces of one solid don't share a vertex *index* even though they share a 3D *position* — connectivity must union by position, not just by shared index) and honestly refuses when there's only one connected component.

### Library insertion: always an independent copy

`src/library/LibraryInsertion.ts`'s `remapSavedModelForInsertion()` gives every asset/material/component/connection a fresh id on each insertion (the same id-remapping idiom `DuplicateCommand` uses for a single subtree, generalized to a `SavedModel`'s potentially multi-root snapshot). No two projects, and no two insertions in the same project, ever share a live mutable `SceneObject`/asset/material instance. See [LIBRARY.md](LIBRARY.md).

### AI extension: real computations, not invented ones

`AIProvider` (`src/ai/providers/AIProvider.ts`) extends beyond `interpret()` with `analyzeImage`/`suggestComponents`/`generateConstructionPlan` (M22). All three are genuine computations — `analyzeImage` reuses the reconstruction pipeline's segmentation for real pixel statistics (never object recognition); `suggestComponents`/`generateConstructionPlan` derive from the live `ObjectManager`/`AssemblyManager` state (unpaired mirror names, disconnected pieces, hierarchy depth, real connections) — never a language-model guess. `MockProvider` implements all three for real; `GeminiProvider`'s versions throw the same Stage-3-disabled error as its `interpret()`.

### Construction Mode and the geometry-editing boundary

`ConstructionEngine` (`src/construction/`) mirrors `SimulationEngine`'s shape: a MODEL→COMPONENTS→VOXELS→LAYERS→PLAN stage registry. Only PLAN has real logic (it reuses `generateConstructionPlan()`); the rest honestly report `not_implemented`. `src/editor/geometry/GeometryEditOperation.ts` defines the interface boundary a future real vertex/face/edge editor would implement (`VertexSelection`/`FaceSelection`/`EdgeSelection`, an `Extrude`/`Inset`/`Bevel`/`Subdivide`/`Smooth`/`Decimate` operation union) — every operation concretely returns `{status:'not_implemented'}` today, same discipline as `simulation/modules.ts`. Both exist so a later real implementation slots in without a redesign, never so the UI can pretend something works that doesn't.

## Performance notes

- No new geometry/material objects are allocated per animation frame; the render loop (`Viewport.loop`) only updates camera aspect, `OrbitControls`, and registered per-frame callbacks (currently none beyond controls).
- `MaterialManager` caches one `THREE.MeshStandardMaterial` per `MaterialDefinition` id and mutates it in place on edit rather than rebuilding/disposing (see above) — this is also a performance win, not just a correctness one.
- Geometry/material disposal happens on object removal (`SceneSync.unmount` → `MeshFactory.disposeMesh`) and on material removal (`MaterialManager.disposeCached`).
- Autosave is debounced (~2s idle) off a single `project:dirty` bus event rather than writing to IndexedDB on every mouse-drag tick.
