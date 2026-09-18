# STARK PROTOTYPE LAB

A real, functional 3D prototyping laboratory for building multi-part prototypes — exosuits, robots, vehicles, drones, mechanical assemblies — in the browser. Built with Three.js, TypeScript, and IndexedDB. No paid backend required.

Every tool in the UI either works for real or is explicitly labeled **Coming Soon**; nothing is decorative.

## Features (implemented)

- 3D viewport: scene, camera, lighting, orbit controls, grid/axes.
- 7 primitive geometry types (box, sphere, cylinder, cone, capsule, plane, torus) with real PBR materials — 10 presets (metal/plastic/glass/fiber/titanium/carbonFiber/rubber/gold/redMetal/blueMetal/custom).
- Transform gizmo (move/rotate/scale) with two-way numeric Inspector binding — for a single object or a multi-selection (via a synthetic centroid pivot). `W`/`E`/`R` switch tool mode, `Ctrl`/`Cmd`+`D` duplicates — all guarded so typing in a text field never triggers a shortcut.
- Click and Shift/Ctrl multi-select; Group/Ungroup; Duplicate; Delete; **Join** (merges selected meshes' world-baked geometry into one, with a real warning if materials differ) and **Separate** (reverses a Join losslessly, or splits a genuinely disconnected geometry by real connected-component analysis — an honest refusal if there are no detectable seams).
- Mirror (X/Y/Z) using real Matrix4/Quaternion reflection, not Euler-angle flipping.
- **Import** real `.glb`/`.gltf`/`.obj`/`.stl` model files (`three`'s own loaders) — see [IMPORT_SYSTEM.md](IMPORT_SYSTEM.md).
- **Image → 3D**: a deterministic silhouette → depth → geometry reconstruction pipeline from a single photo, always labeled ESTIMATED. **Image → Build**: a photo placed as a non-geometry `ReferenceImage` plane to build primitives over manually. See [IMAGE_TO_3D.md](IMAGE_TO_3D.md).
- **Library**: My Models (save/insert a whole scene), My Parts (save/insert a selection), and External Sources (Printables/Thingiverse — real link-out only, never a fabricated search-result list). See [LIBRARY.md](LIBRARY.md).
- Assembly/Connect: typed (`FIXED`/`HINGE`/`SLIDER`/`FREE`) structural relationships between objects, independent of parent/child hierarchy, visualized as a line in the viewport. See [ASSEMBLY_SYSTEM.md](ASSEMBLY_SYSTEM.md).
- Command-pattern Undo/Redo with a persistent Activity Log.
- Projects stored in IndexedDB (Dexie v2): create/open/save/save-as/duplicate/rename/delete, with debounced autosave. Imported/reconstructed geometry and reference images round-trip through save/load/version/export like everything else.
- Scene tree: client-side search, and grouping by `metadata.origin` (Build/Import/Reconstruction/Joined).
- 5 real starter templates: Blank, Humanoid, Exosuit, Robot, Vehicle — each a genuine component hierarchy, not placeholder art.
- Versioning: create/restore a full scene snapshot, with a real structural diff (Compare) against the current scene.
- `.stark` JSON export/import.
- AI layer: a natural-language command box running a real Parse → Validate → Permission → Preview → Confirm → Execute pipeline, with a deterministic offline `MockProvider` by default (Gemini is wired but disabled — see [AI_TOOLS.md](AI_TOOLS.md)). Beyond text commands, the AI layer also exposes `analyzeImage` (real pixel facts, never object recognition), `suggestComponents`, and `generateConstructionPlan` (both real, scene-derived computations, never an invented idea).
- AI Analysis: piece count, bounding box, symmetry, orphaned pieces, duplicate names, extreme scale, an approximate center of mass — each tagged FACT/OBSERVATION/ESTIMATION/SUGGESTION/WARNING.
- Simulation and Bot systems: real architecture and registries, explicitly marked "Coming Soon" — `execute()` never fabricates a result.
- **Construction Mode**: a MODEL→COMPONENTS→VOXELS→LAYERS→PLAN pipeline; the first four stages honestly report "Coming Soon," PLAN is real (reuses `generateConstructionPlan()`) and its output can be downloaded as a `.txt` file.
- A future geometry-editing layer's module boundary (`src/editor/geometry/`) is defined (vertex/face/edge selections, an Extrude/Inset/Bevel/Subdivide/Smooth/Decimate operation set) but not wired up — every operation honestly returns `not_implemented`, surfaced via a real "Geometry Edit — Coming Soon" entry point in the Inspector for imported/reconstructed meshes.
- Automated tests: `vitest` unit tests across core/3D/storage/reconstruction/AI (`npm test`).

See [ARCHITECTURE.md](ARCHITECTURE.md), [DATA_MODEL.md](DATA_MODEL.md), [AI_TOOLS.md](AI_TOOLS.md), [IMPORT_SYSTEM.md](IMPORT_SYSTEM.md), [IMAGE_TO_3D.md](IMAGE_TO_3D.md), [LIBRARY.md](LIBRARY.md), [ASSEMBLY_SYSTEM.md](ASSEMBLY_SYSTEM.md), and [ROADMAP.md](ROADMAP.md) for details.

## Requirements

- Node.js 18+ (developed/verified on Node 22).

## Install & run

```bash
npm install
npm run dev       # http://localhost:5173
```

```bash
npm run build      # type-checks and produces a static build in dist/
npm run preview     # serves the production build locally
npm run typecheck   # tsc -b --noEmit only
npm test            # vitest run — unit tests across core/3d/storage/reconstruction/ai
```

No environment variables or API keys are required to run the app — it works fully offline against IndexedDB, with the AI layer defaulting to the offline MockProvider.

## Usage

1. Open the app — you land on **STARK PROTOTYPE LAB**'s Landing screen.
2. **New Prototype** → pick a template (Blank/Humanoid/Exosuit/Robot/Vehicle) → **Create**.
3. Click objects in the viewport or the Components tree to select them (Shift/Ctrl for multi-select).
4. Use the bottom toolbar for Select/Move/Rotate/Scale/Mirror/Join/Separate/Connect/Group/Ungroup/Duplicate/Delete/Undo/Redo (or the `W`/`E`/`R`/`Ctrl`+`D` shortcuts), and **AI** to jump to the AI command box.
5. **Import Model** or **Image → 3D**/**Image → Build** from the header to bring in real geometry or a photo reference. **Library** to save/insert whole scenes (My Models), selections (My Parts), or link out to Printables/Thingiverse.
6. Edit materials, review Assemblies/Versions/Activity Log/Simulation/Bots/Construction Mode, and run AI Analysis from the side panels.
7. **Export .stark** in the header to download the project as JSON; **Import .stark** from the Landing screen to load one back in.

## Project status

Implemented through milestone M24 of the "2.0" migration plan (M0–M13: scaffold → 3D core → object model → geometry/materials → transforms/inspector → multi-select/grouping/undo-redo → materials panel → mirror/assembly → storage → landing/templates → versioning/export/activity-log → AI layer → simulation/bot stubs → docs; M14–M24: assets/typed connections → import → Image→3D → Image→Build → My Models → My Parts → Join/Separate + editor polish → external sources → AI extension → Construction Mode + geometry-editing boundary → automated tests). M25 (this docs pass) closes out the plan. Every milestone was verified against a live, headless-browser run of the app, not just type-checked, and the ones amenable to it are now also pinned as `vitest` regression tests — see individual commit messages for what was tested at each stage.
