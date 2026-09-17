# ARCHITECTURE

## Stack decisions

| Area | Decision | Why |
|---|---|---|
| Build tool | Vite | Zero-config TS/ESM, fast dev server, trivial static build — no backend to orchestrate. |
| Language | TypeScript, strict mode | The data model (object tree, Dexie tables, `.stark` format, 17 AI tool schemas) is complex enough that compile-time checking earns its keep. |
| UI | Vanilla TS + a ~30-line signal/computed/effect store (`src/ui/reactive/Store.ts`) — **no React/Vue** | The editor is fundamentally imperative Three.js scene mutation plus a gizmo↔inspector two-way sync. A signal store gives that without a vdom fighting direct scene mutation, or the weight of a framework the project's own ground rules ask to avoid unless it clearly wins. Revisit if UI state complexity grows enough to justify it. |
| 3D engine | `three` (npm, exact-pinned version) | Required; ESM import avoids CDN version drift. |
| Storage | Dexie 4 over IndexedDB (exact-pinned) | No paid backend allowed. Dexie's schema/index/transaction API is far more tractable than raw `indexedDB` for a relational-ish shape (projects/components/materials/assemblies/versions/history). |

All dependency versions in `package.json` are pinned exactly (no `^`/`~`), with `package-lock.json` committed, so a future `npm install` can't silently pull a breaking change. Bumping a version is a deliberate, reviewed edit.

## Directory layout

```
src/
├── core/        App orchestrator, EventBus, ObjectManager (the object tree), AppState, SceneManager, types
├── 3d/          Renderer/Camera/Controls/Viewport, GeometryFactory, MaterialManager, MeshFactory,
│                SceneSync (model↔Object3D), TransformGizmo, Raycaster, CoordinateSystem, TransformMath,
│                BoundingBox, AssemblyVisualizer
├── editor/      SelectionManager, Inspector, ObjectTree, HistoryManager, GroupingManager,
│                GroupTransformPivot, MirrorTool, AssemblyManager, VersionDiff, commands/ (Command pattern)
├── storage/     StorageAdapter (interface), Database (Dexie impl), ProjectRepository,
│                VersionRepository, HistoryRepository, AutosaveService, Serializer, StarkFileFormat
├── ai/          AIService, providers/ (Mock, Gemini-disabled), ToolRegistry, tools/, ToolParser,
│                ToolValidator, PermissionValidator, PreviewGenerator, AICommandExecutor, AnalysisEngine
├── simulation/  SimulationEngine + modules.ts (stubs)
├── bots/        Bot interface, BotManager, bots.ts (stubs)
├── templates/   TemplateRegistry + blank/humanoid/exosuit/robot/vehicle + shared tree builder
└── ui/          reactive/ (Store, bind), panels/, toolbar/, components/, screens/, styles/
```

### Deviations from the originally sketched layout, and why

- **`src/ai/tools/` has 5 files (objectTools/materialTools/assemblyTools/analysisTools/versionTools), not 17.** Each of the 17 tools is a full `AITool` object (validate/preview/buildCommand); grouping them by the manager they act on kept related logic and helpers together instead of 17 near-duplicate files each re-importing the same three commands.
- **`src/simulation/modules.ts` and `src/bots/bots.ts` are single files, not one-file-per-module/bot.** All 6 simulation modules — and separately, all 6 bots — share one tiny stub factory; splitting each into its own file would have been six copies of the same four lines.
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

## Performance notes

- No new geometry/material objects are allocated per animation frame; the render loop (`Viewport.loop`) only updates camera aspect, `OrbitControls`, and registered per-frame callbacks (currently none beyond controls).
- `MaterialManager` caches one `THREE.MeshStandardMaterial` per `MaterialDefinition` id and mutates it in place on edit rather than rebuilding/disposing (see above) — this is also a performance win, not just a correctness one.
- Geometry/material disposal happens on object removal (`SceneSync.unmount` → `MeshFactory.disposeMesh`) and on material removal (`MaterialManager.disposeCached`).
- Autosave is debounced (~2s idle) off a single `project:dirty` bus event rather than writing to IndexedDB on every mouse-drag tick.
