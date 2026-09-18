# ROADMAP

## Known limitations of the current build

- **Connection points are always `[0,0,0]`.** `connect_objects`/the Connect toolbar button record a structural relationship between two objects (now with a real, stored `type: FIXED|HINGE|SLIDER|FREE`), but there's no on-mesh point-picking UI yet — `connectionPointA`/`connectionPointB` are placeholders. Real point-picking (click a point on each mesh) is future work.
- **No physics/kinematics solver.** `Connection.type` is real, stored data, but nothing executes on it yet — see `SimulationEngine` below.
- **No 3D interchange *export*.** `.stark` (JSON) is the only export format. Import is real (`.glb`/`.gltf`/`.obj`/`.stl` — see IMPORT_SYSTEM.md); glTF export is deferred.
- **Gemini is wired but disabled.** See [AI_TOOLS.md](AI_TOOLS.md) — no API key in the frontend, no backend proxy exists yet. `MockProvider`'s natural-language understanding is a regex table, not an LLM; it covers a fixed set of phrasings (documented in AI_TOOLS.md), not open-ended English. `GeminiProvider`'s `analyzeImage`/`suggestComponents`/`generateConstructionPlan` (M22) all throw the same Stage-3-disabled error as `interpret()`.
- **Simulation and Bots are architecture only.** `SimulationEngine`/`BotManager` are real registries with real interfaces; every `execute()`/`run()` call honestly returns a not-implemented result. No physics, collision, structural analysis, or bot automation actually runs yet.
- **Construction Mode is mostly architecture too.** Of its 5 stages (MODEL→COMPONENTS→VOXELS→LAYERS→PLAN), only PLAN is real (it reuses `generateConstructionPlan()`); the other four honestly report `not_implemented` — see ASSEMBLY_SYSTEM.md.
- **No geometry-editing layer.** `src/editor/geometry/GeometryEditOperation.ts` defines the future interface boundary (vertex/face/edge selections, Extrude/Inset/Bevel/Subdivide/Smooth/Decimate), but every operation honestly returns `not_implemented` — there is no way to edit an imported/reconstructed mesh's actual vertices/faces/edges yet, only its transform/material.
- **Image→3D reconstruction is single-object, single-image only.** `ReconstructionInput.mode` has real `TWO_IMAGES`/`FOUR_IMAGES`/`MULTI_VIEW` options, but only `ONE_IMAGE` is wired to a real engine — the rest are real, present, disabled "Coming Soon" buttons. No credible client-side technique exists for multi-part component detection from one photo, so `componentDetection` always reports `'single-object'`.
- **External Sources (Printables/Thingiverse) are link-out only.** `ModelSource.capabilities.search` is `false` for both — there is no live search-result list, by design (see LIBRARY.md); adding a real search-backed source is future work.
- **Library entries have no thumbnails.** `SavedModel.thumbnail` exists in the schema but nothing generates one yet — list rows show name/date/object-count only, no fake placeholder image.
- **Center of mass is an unweighted bounding-box-center average**, not a density/volume-weighted physical computation. Labeled `ESTIMATION` everywhere it's shown, on purpose.
- **The right-side panel column is long** (Inspector, Materials, Assemblies, Reference Images, Versions, Activity Log, Simulation/Bots, Construction Mode) with no tabs/collapse yet — usable via scroll, not ideal on very small viewports.
- **Test coverage is unit-level, not end-to-end.** `vitest` covers pure logic (object tree, transform math, serialization, reconstruction math, AI-extension computations) that doesn't need a live Three.js/WebGL context; the broader end-to-end flows are still verified manually via headless-Chromium runs at each milestone, not by an automated browser test suite.

## Planned next steps, roughly in priority order

1. **Real point-picking for Connect.** Click a point on each of two meshes (a raycast hit on the mesh surface, converted to that mesh's local space) to set real `connectionPointA`/`B`.
2. **A first real physics/kinematics pass on typed Connections.** `HINGE`/`SLIDER` already store real data; the first real `SimulationEngine.Movement`/`Physics` module would give them actual range-of-motion/force behavior.
3. **Stage 3 of the Gemini rollout.** Stand up a secure backend endpoint (`Frontend → secure API endpoint → Gemini`), wire `GeminiProvider`'s `endpointUrl` and flip `available`. No change needed to the pipeline downstream of `AIService.interpret()` — `ToolParser`/`ToolValidator`/`PermissionValidator`/`PreviewGenerator`/`AICommandExecutor` are provider-agnostic already, and the same applies to `analyzeImage`/`suggestComponents`/`generateConstructionPlan`.
4. **glTF export** (Three.js ships `GLTFExporter`) as a second export option alongside `.stark`.
5. **A real geometry-editing layer**, implementing the `src/editor/geometry/GeometryEditOperation.ts` boundary for real — starting with the simplest operations (Smooth/Decimate) against imported/reconstructed meshes.
6. **A real search-backed `ModelSource`** for Printables and/or Thingiverse, if/when a compliant public API is available — implementing `search()`/`capabilities.search:true` without redesigning `LibraryScreen`.
7. **Real multi-view Image→3D** (`TWO_IMAGES`/`FOUR_IMAGES`/`MULTI_VIEW`), improving reconstruction quality beyond the single-photo heightfield heuristic.
8. **SimulationEngine.Weight** as a next real module: density-weighted mass from geometry volume × a per-material-preset density, feeding a real (not bounding-box-average) center of mass into `AnalysisEngine`.
9. **BotManager.MaterialBot** as a first real bot: batch-apply a material preset across a selection or a `role`/`symmetryGroup` — same shape as the AI's `change_material` tool, reused rather than reimplemented.
10. **Panel tabs.** Split the right-panel column into tabs once it's clearly cramped in real use.
11. **Code-split the production bundle.** `npm run build` currently emits a single ~945KB (~245KB gzipped) JS chunk — mostly Three.js. Splitting the editor shell from the Landing screen (dynamic `import()`) would let a first visit load less before showing the Landing screen.
12. **Voice input** for the AI command box (Web Speech API → the same `AIService.interpret()` text path — no new pipeline).
13. **Library thumbnails.** A real capture mechanism (render the saved scene/part once, store a small PNG) rather than the current name/date/count-only list row.
14. **End-to-end browser tests**, complementing the current unit-level `vitest` suite, once the app's UI surface stabilizes enough to justify the maintenance cost of Playwright-driven specs living in the repo rather than as one-off manual verification runs.

## Explicitly out of scope for now

- Multi-user / real-time collaboration.
- A remote database backend (the `IStorageAdapter` seam exists specifically so this can be added later without a rewrite — see ARCHITECTURE.md).
- Physically-accurate structural/collision simulation.
- Scraping or auto-downloading from Printables/Thingiverse, or any other bypass of a source's own access controls — External Sources stays link-out only unless a source's own API explicitly supports more (see LIBRARY.md).
