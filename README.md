# STARK PROTOTYPE LAB

A real, functional 3D prototyping laboratory for building multi-part prototypes — exosuits, robots, vehicles, drones, mechanical assemblies — in the browser. Built with Three.js, TypeScript, and IndexedDB. No paid backend required.

Every tool in the UI either works for real or is explicitly labeled **Coming Soon**; nothing is decorative.

## Features (implemented)

- 3D viewport: scene, camera, lighting, orbit controls, grid/axes.
- 7 primitive geometry types (box, sphere, cylinder, cone, capsule, plane, torus) with real PBR materials (metal/plastic/glass/fiber/custom).
- Transform gizmo (move/rotate/scale) with two-way numeric Inspector binding — for a single object or a multi-selection (via a synthetic centroid pivot).
- Click and Shift/Ctrl multi-select; Group/Ungroup; Duplicate; Delete.
- Mirror (X/Y/Z) using real Matrix4/Quaternion reflection, not Euler-angle flipping.
- Assembly/Connect: structural relationships between objects, independent of parent/child hierarchy, visualized as a line in the viewport.
- Command-pattern Undo/Redo with a persistent Activity Log.
- Projects stored in IndexedDB (Dexie): create/open/save/save-as/duplicate/rename/delete, with debounced autosave.
- 5 real starter templates: Blank, Humanoid, Exosuit, Robot, Vehicle — each a genuine component hierarchy, not placeholder art.
- Versioning: create/restore a full scene snapshot, with a real structural diff (Compare) against the current scene.
- `.stark` JSON export/import.
- AI layer: a natural-language command box running a real Parse → Validate → Permission → Preview → Confirm → Execute pipeline, with a deterministic offline `MockProvider` by default (Gemini is wired but disabled — see [AI_TOOLS.md](AI_TOOLS.md)).
- AI Analysis: piece count, bounding box, symmetry, orphaned pieces, duplicate names, extreme scale, an approximate center of mass — each tagged FACT/OBSERVATION/ESTIMATION/SUGGESTION/WARNING.
- Simulation and Bot systems: real architecture and registries, explicitly marked "Coming Soon" — `execute()` never fabricates a result.

See [ARCHITECTURE.md](ARCHITECTURE.md), [DATA_MODEL.md](DATA_MODEL.md), [AI_TOOLS.md](AI_TOOLS.md), and [ROADMAP.md](ROADMAP.md) for details.

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
```

No environment variables or API keys are required to run the app — it works fully offline against IndexedDB, with the AI layer defaulting to the offline MockProvider.

## Usage

1. Open the app — you land on **STARK PROTOTYPE LAB**'s Landing screen.
2. **New Prototype** → pick a template (Blank/Humanoid/Exosuit/Robot/Vehicle) → **Create**.
3. Click objects in the viewport or the Components tree to select them (Shift/Ctrl for multi-select).
4. Use the bottom toolbar for Select/Move/Rotate/Scale/Mirror/Connect/Group/Ungroup/Duplicate/Delete/Undo/Redo, and **AI** to jump to the AI command box.
5. Edit materials, review Assemblies/Versions/Activity Log, and run AI Analysis from the side panels.
6. **Export .stark** in the header to download the project as JSON; **Import .stark** from the Landing screen to load one back in.

## Project status

Implemented through milestone M13 of the build plan (scaffold → 3D core → object model → geometry/materials → transforms/inspector → multi-select/grouping/undo-redo → materials panel → mirror/assembly → storage → landing/templates → versioning/export/activity-log → AI layer → simulation/bot stubs → docs). Every milestone was verified against a live, headless-browser run of the app, not just type-checked — see individual commit messages for what was tested at each stage.
