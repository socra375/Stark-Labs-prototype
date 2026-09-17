import * as THREE from 'three';
import type { ObjectManager } from '../core/ObjectManager';
import type { AssemblyManager } from '../editor/AssemblyManager';
import type { CoordinateSystem } from '../3d/CoordinateSystem';
import { worldBoundsForObject, unionBounds } from '../3d/BoundingBox';

export type FindingKind = 'FACT' | 'OBSERVATION' | 'ESTIMATION' | 'SUGGESTION' | 'WARNING';

export interface Finding {
  kind: FindingKind;
  message: string;
}

/**
 * Analyzes the live scene and returns findings explicitly tagged FACT/OBSERVATION/ESTIMATION/
 * SUGGESTION/WARNING — an estimation (e.g. center of mass) must never be presented as if it
 * were a measured fact. All math here is real (bounding boxes, counts, symmetry pairing);
 * nothing is fabricated or guessed by a language model.
 */
export class AnalysisEngine {
  constructor(private objects: ObjectManager, private assembly: AssemblyManager, private coords: CoordinateSystem) {}

  analyze(): Finding[] {
    const findings: Finding[] = [];
    const all = this.objects.getAll();
    const meshes = all.filter((o) => o.type === 'mesh');

    findings.push({ kind: 'FACT', message: `${all.length} total object(s): ${meshes.length} mesh(es), ${all.length - meshes.length} group(s).` });

    // Overall bounding box.
    const boxes = meshes.map((o) => worldBoundsForObject(o, this.coords)).filter((b): b is THREE.Box3 => !!b);
    const union = unionBounds(boxes);
    if (union) {
      const size = union.getSize(new THREE.Vector3());
      findings.push({ kind: 'FACT', message: `Overall bounding box: ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} units.` });

      // Center of mass: an unweighted average of each mesh's bounding-box center — a real but
      // approximate proxy for volume/density-weighted mass, so it's reported as an estimation.
      const center = boxes.reduce((acc, b) => acc.add(b.getCenter(new THREE.Vector3())), new THREE.Vector3()).divideScalar(boxes.length || 1);
      findings.push({ kind: 'ESTIMATION', message: `Approximate center of mass (unweighted bounding-box average): [${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}]. Not a physically simulated measurement.` });
    }

    // Symmetry check: _L/_R name pairs. Scans `all`, not just `meshes` — the _L/_R sides of a
    // rig are typically group nodes (e.g. Arm_L/Arm_R), not meshes themselves.
    const lNames = new Set(all.filter((o) => o.name.endsWith('_L')).map((o) => o.name.slice(0, -2)));
    const rNames = new Set(all.filter((o) => o.name.endsWith('_R')).map((o) => o.name.slice(0, -2)));
    const paired = [...lNames].filter((n) => rNames.has(n));
    const unpaired = [...lNames].filter((n) => !rNames.has(n));
    if (lNames.size || rNames.size) {
      findings.push({ kind: 'OBSERVATION', message: `${paired.length} left/right symmetric pair(s) detected by name (_L/_R).` });
      if (unpaired.length) findings.push({ kind: 'WARNING', message: `Asymmetric: ${unpaired.join(', ')} has an _L side but no matching _R.` });
    }

    // Disconnected pieces: meshes with no parent group AND no assembly connection.
    const connectedIds = new Set(this.assembly.getAll().flatMap((c) => [c.parentObjectId, c.childObjectId]));
    const orphans = meshes.filter((o) => !o.parentId && !connectedIds.has(o.id));
    if (orphans.length) findings.push({ kind: 'WARNING', message: `${orphans.length} disconnected piece(s) with no parent and no assembly connection: ${orphans.map((o) => o.name).join(', ')}.` });

    // Duplicate names.
    const nameCounts = new Map<string, number>();
    for (const o of all) nameCounts.set(o.name, (nameCounts.get(o.name) ?? 0) + 1);
    const dupes = [...nameCounts.entries()].filter(([, n]) => n > 1);
    if (dupes.length) findings.push({ kind: 'OBSERVATION', message: `Duplicate names in use: ${dupes.map(([n, c]) => `${n} (×${c})`).join(', ')}.` });

    // Extreme scale.
    const extreme = all.filter((o) => o.scale.some((s) => s < 0.05 || s > 20));
    if (extreme.length) findings.push({ kind: 'WARNING', message: `${extreme.length} object(s) with an extreme scale factor (<0.05 or >20): ${extreme.map((o) => o.name).join(', ')}.` });

    if (!meshes.length) findings.push({ kind: 'SUGGESTION', message: 'The scene has no mesh objects yet — add a geometry to begin.' });

    return findings;
  }

  /** A one-line headline for surfaces (like the AI chat) that don't render the full findings list. */
  summarize(): string {
    const findings = this.analyze();
    const facts = findings.filter((f) => f.kind === 'FACT').map((f) => f.message);
    const warnings = findings.filter((f) => f.kind === 'WARNING').length;
    return `${facts.join(' ')} ${warnings ? `${warnings} warning(s) — see AI Analysis panel.` : 'No warnings.'}`.trim();
  }
}
