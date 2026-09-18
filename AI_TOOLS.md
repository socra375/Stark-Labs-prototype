# AI TOOLS

## Provider architecture

```
AIService
├── MockProvider   (default, always available — deterministic, rule-based, offline)
└── GeminiProvider (registered, permanently `available: false` in this deployment)
```

`AIService.setActive('gemini')` is refused (`GeminiProvider.available === false`) because:

- No Gemini API key is embedded in the frontend, and never will be.
- `GeminiProvider` is written to call a secure backend/proxy endpoint (`Frontend → secure API endpoint → Gemini`), but that endpoint doesn't exist in this project. No local Express/proxy stand-in was built to fake one — that would just be a different flavor of "fake UI".
- When a real secure endpoint exists, enabling Gemini is a matter of constructing `GeminiProvider` with its URL and flipping `available`; it feeds into the exact same pipeline below as `MockProvider` does today, so nothing else changes.

`MockProvider` is not a toy: it runs the real tool pipeline end-to-end against the live scene, with real validation, real previews, real (undoable) execution. What's "mock" about it is specifically the natural-language understanding — a table of regexes (`src/ai/providers/MockProvider.ts`), not a language model — and every one of its chat responses is prefixed `[MOCK]` so it's never mistaken for live Gemini output.

## The safety pipeline

```
User text
  ↓
AIService.interpret(text)                — provider maps text → ToolCallCandidate[] (raw names, no ids)
  ↓
ToolParser.resolve(candidate)             — resolves targetName/targetQuery/targetNameA/B/targetNames
  │                                          against the live ObjectManager into objectId(s)
  ↓
ToolValidator.validate(candidate, ctx)    — tool exists? args well-formed? referenced objects exist
  │                                          and aren't locked? (folded into each tool's validate())
  ↓
PermissionValidator.check(toolName)       — sets requiresConfirmation = tool.destructive
  ↓
PreviewGenerator.generate(candidate, ctx) — builds a structured AIProposal; NEVER mutates state
  ↓
[if requiresConfirmation] user sees the AI PROPOSAL card (Target / Operation / Changes /
  Affected count) and must click Apply — Cancel leaves state untouched
  ↓
AICommandExecutor.apply(prepared)         — the ONLY function that mutates state; always via
                                             HistoryManager.execute(), so AI actions are undoable
                                             exactly like manual edits
```

`AIProposal` (`src/ai/types.ts`) is real, structured data — target list, operation, a per-field before→after diff, an affected-object count — not a prose guess, and `PreviewGenerator`/every tool's `preview()` never touches `ObjectManager`/`MaterialManager`/`AssemblyManager`.

## The 19 tools

Grouped by the manager they act on (`src/ai/tools/*.ts`); `destructive: true` tools require confirmation.

**Object** (`objectTools.ts`): `create_object`, `delete_object` (destructive), `duplicate_object`, `rename_object`, `move_object`, `rotate_object`, `scale_object` (single `objectId` or resolved `objectIds` — supports "scale both arms 10%"), `group_objects`, `ungroup_objects`, `mirror_object`.

**Material** (`materialTools.ts`): `change_material` — 10 presets (see DATA_MODEL.md), multi-word phrases ("carbon fiber", "red metal") resolved via a phrase→preset lookup table in `MockProvider` since a plain regex alternation can't express them.

**Assembly** (`assemblyTools.ts`): `connect_objects`, `disconnect_objects`.

**Analysis** (`analysisTools.ts`, read-only, never destructive): `inspect_object`, `analyze_scene`, `suggest_components` (M22 — real scene-derived suggestions, see below), `generate_construction_plan` (M22 — real computed build order, see below).

**Version** (`versionTools.ts`): `create_version`, `restore_version` (destructive — replaces the live scene).

Note: Join/Separate are real editor operations (bottom toolbar), not AI tools — there is no natural-language "join X and Y" command in this build.

## Example commands (MockProvider)

```
create a box named Chestplate
delete the torso
duplicate arm_l
rename torso to Chassis
move torso to 0 1.2 0
rotate helmet to 0 45 0
scale both arms by 10%
group arm_l and arm_r
ungroup arm_l
mirror arm_l across x
change material of torso to metal
connect torso and arm_l
disconnect torso and arm_l
inspect torso
analyze the scene
suggest components
generate a construction plan
create version v1
restore version v1
```

Group-phrase resolution ("both arms", "all wheels") prefers `metadata.role`/`metadata.symmetryGroup` over a raw name-substring match, and never matches a descendant of an already-matched object (e.g. "both arms" resolves to the two `Arm_L`/`Arm_R` group nodes, not those groups *and* their `Upperarm`/`Forearm` children, which would double-apply the operation since a child's transform already inherits its parent's).

## AI Analysis

`AnalysisEngine.analyze()` (`src/ai/AnalysisEngine.ts`) computes, from the real live scene:

- Total object/mesh/group counts (**FACT**)
- Overall bounding box (**FACT**)
- Approximate center of mass — an unweighted average of each mesh's bounding-box center (**ESTIMATION**, explicitly labeled as not a physical measurement)
- Left/right symmetry pairs by `_L`/`_R` name suffix, scanning all objects (not just meshes — a rig's `_L`/`_R` sides are typically group nodes) (**OBSERVATION**/**WARNING** for an unpaired side)
- Disconnected pieces — meshes with no parent and no `Connection` (**WARNING**)
- Duplicate names (**OBSERVATION**)
- Extreme scale factors, <0.05 or >20 (**WARNING**)

Every finding is tagged FACT / OBSERVATION / ESTIMATION / SUGGESTION / WARNING; an estimation is never presented as a measurement.

## AI extension: analyzeImage / suggestComponents / generateConstructionPlan (M22)

`AIProvider` (`src/ai/providers/AIProvider.ts`) exposes three methods beyond `interpret()`. All three are real computations, never a language-model guess — `MockProvider` implements them for real, and `GeminiProvider`'s versions throw the same Stage-3-disabled error as its `interpret()`:

- **`analyzeImage(file)`** (`src/ai/ImageAnalysis.ts`) reports only objectively-computable pixel facts about an uploaded image — dimensions, aspect ratio, alpha-transparency presence, average color, and segmented foreground coverage (reusing the Image→3D pipeline's real deterministic segmentation, see [IMAGE_TO_3D.md](IMAGE_TO_3D.md)). It never performs object recognition — no credible client-side technique exists for that, and inventing one would violate this project's "never fake it" rule. Surfaced in the Image→3D workspace immediately on upload.
- **`suggestComponents(objects, assembly)`** (`src/ai/ComponentSuggestions.ts`) derives real, scene-grounded suggestions: an unpaired `_L`/`_R` mirror name, a mesh with no parent and no assembly connection. Every suggestion traces to an objectively-checkable fact about the live scene, never an invented design idea.
- **`generateConstructionPlan(objects, assembly)`** (`src/ai/ConstructionPlan.ts`) computes a real build order: meshes ordered by hierarchy depth (shallowest first, i.e. base pieces before their children), followed by a `CONNECT` step per real `Connection`. No physics/kinematics execute — this only orders the pieces. Reused as-is by Construction Mode's real PLAN stage (see [ASSEMBLY_SYSTEM.md](ASSEMBLY_SYSTEM.md)).

Both `suggestComponents` and `generateConstructionPlan` are also reachable as read-only AI chat tools (`suggest_components`/`generate_construction_plan` above), so the same real computation is available from the command box or programmatically.
