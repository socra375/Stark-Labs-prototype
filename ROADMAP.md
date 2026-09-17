# ROADMAP

## Known limitations of the current build

- **Connection points are always `[0,0,0]`.** `connect_objects`/the Connect toolbar button record a structural relationship between two objects, but there's no on-mesh point-picking UI yet — `connectionPointA`/`connectionPointB` are placeholders. Real point-picking (click a point on each mesh) is future work.
- **No 3D interchange export.** `.stark` (JSON) is the only export format. glTF/OBJ export is deferred.
- **Gemini is wired but disabled.** See [AI_TOOLS.md](AI_TOOLS.md) — no API key in the frontend, no backend proxy exists yet. `MockProvider`'s natural-language understanding is a regex table, not an LLM; it covers a fixed set of phrasings (documented in AI_TOOLS.md), not open-ended English.
- **Simulation and Bots are architecture only.** `SimulationEngine`/`BotManager` are real registries with real interfaces; every `execute()`/`run()` call honestly returns a not-implemented result. No physics, collision, structural analysis, or bot automation actually runs yet.
- **Center of mass is an unweighted bounding-box-center average**, not a density/volume-weighted physical computation. Labeled `ESTIMATION` everywhere it's shown, on purpose.
- **The right-side panel column is long** (Inspector, Materials, Assemblies, Versions, Activity Log, Simulation/Bots) with no tabs/collapse yet — usable via scroll, not ideal on very small viewports.

## Planned next steps, roughly in priority order

1. **Real point-picking for Connect.** Click a point on each of two meshes (a raycast hit on the mesh surface, converted to that mesh's local space) to set real `connectionPointA`/`B`.
2. **Stage 3 of the Gemini rollout.** Stand up a secure backend endpoint (`Frontend → secure API endpoint → Gemini`), wire `GeminiProvider`'s `endpointUrl` and flip `available`. No change needed to the pipeline downstream of `AIService.interpret()` — `ToolParser`/`ToolValidator`/`PermissionValidator`/`PreviewGenerator`/`AICommandExecutor` are provider-agnostic already.
3. **glTF export** (Three.js ships `GLTFExporter`) as a second export option alongside `.stark`.
4. **SimulationEngine.Weight** as the first real module: density-weighted mass from geometry volume × a per-material-preset density, feeding a real (not bounding-box-average) center of mass into `AnalysisEngine`.
5. **BotManager.MaterialBot** as the first real bot: batch-apply a material preset across a selection or a `role`/`symmetryGroup` — same shape as the AI's `change_material` tool, reused rather than reimplemented.
6. **Panel tabs.** Split the right-panel column into tabs (Inspector+Material / Assemblies+Versions / Activity+Simulation/Bots) once it's clearly cramped in real use.
7. **Code-split the production bundle.** `npm run build` currently emits a single ~785KB (203KB gzipped) JS chunk — mostly Three.js. Splitting the editor shell from the Landing screen (dynamic `import()`) would let a first visit load less before showing the Landing screen.
8. **Voice input** for the AI command box (Web Speech API → the same `AIService.interpret()` text path — no new pipeline).
9. **Image → 3D**, per the original spec's future-architecture section: object detection → segmentation → depth estimation → geometry → voxelization → prototype. Not started; would live as a new `ScannerBot` implementation once BotManager execution is real.

## Explicitly out of scope for now

- Multi-user / real-time collaboration.
- A remote database backend (the `IStorageAdapter` seam exists specifically so this can be added later without a rewrite — see ARCHITECTURE.md).
- Physically-accurate structural/collision simulation.
