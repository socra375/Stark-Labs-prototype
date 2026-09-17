import * as THREE from 'three';
import type { GeometryDefinition, GeometryType } from '../core/types';

type Builder = (params: Record<string, number>) => THREE.BufferGeometry;

const builders: Record<GeometryType, Builder> = {
  box: (p) => new THREE.BoxGeometry(p.width ?? 1, p.height ?? 1, p.depth ?? 1),
  sphere: (p) => new THREE.SphereGeometry(p.radius ?? 0.5, p.widthSegments ?? 24, p.heightSegments ?? 16),
  cylinder: (p) =>
    new THREE.CylinderGeometry(p.radiusTop ?? 0.5, p.radiusBottom ?? 0.5, p.height ?? 1, p.radialSegments ?? 20),
  cone: (p) => new THREE.ConeGeometry(p.radius ?? 0.5, p.height ?? 1, p.radialSegments ?? 20),
  capsule: (p) => new THREE.CapsuleGeometry(p.radius ?? 0.4, p.length ?? 0.6, p.capSegments ?? 6, p.radialSegments ?? 16),
  plane: (p) => new THREE.PlaneGeometry(p.width ?? 1, p.height ?? 1),
  torus: (p) => new THREE.TorusGeometry(p.radius ?? 0.5, p.tube ?? 0.15, p.radialSegments ?? 16, p.tubularSegments ?? 32),
};

export const GEOMETRY_DEFAULT_PARAMS: Record<GeometryType, Record<string, number>> = {
  box: { width: 1, height: 1, depth: 1 },
  sphere: { radius: 0.5, widthSegments: 24, heightSegments: 16 },
  cylinder: { radiusTop: 0.5, radiusBottom: 0.5, height: 1, radialSegments: 20 },
  cone: { radius: 0.5, height: 1, radialSegments: 20 },
  capsule: { radius: 0.4, length: 0.6, capSegments: 6, radialSegments: 16 },
  plane: { width: 1, height: 1 },
  torus: { radius: 0.5, tube: 0.15, radialSegments: 16, tubularSegments: 32 },
};

export const GEOMETRY_TYPES: GeometryType[] = ['box', 'sphere', 'cylinder', 'cone', 'capsule', 'plane', 'torus'];

/** Registry mapping geometry type -> THREE.BufferGeometry builder. Extend by adding a new type + builder. */
export class GeometryFactory {
  create(def: GeometryDefinition): THREE.BufferGeometry {
    const build = builders[def.type];
    if (!build) throw new Error(`Unknown geometry type: ${def.type}`);
    const geo = build(def.params);
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    return geo;
  }

  defaultDefinition(type: GeometryType): GeometryDefinition {
    return { type, params: { ...GEOMETRY_DEFAULT_PARAMS[type] } };
  }
}
