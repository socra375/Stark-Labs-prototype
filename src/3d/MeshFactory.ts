import * as THREE from 'three';
import type { SceneObject } from '../core/types';
import { GeometryFactory } from './GeometryFactory';
import type { MaterialManager } from './MaterialManager';

const DEFAULT_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.3, roughness: 0.6 });

/** Builds a THREE.Object3D (Mesh for 'mesh' SceneObjects, Group for 'group') from a SceneObject. */
export class MeshFactory {
  private geometryFactory = new GeometryFactory();

  constructor(private materials: MaterialManager) {}

  build(obj: SceneObject): THREE.Object3D {
    if (obj.type === 'group') {
      const group = new THREE.Group();
      group.name = obj.id;
      this.applyTransform(group, obj);
      return group;
    }
    const geometry = obj.geometry ? this.geometryFactory.create(obj.geometry) : new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const material = obj.material ? this.materials.getThreeMaterial(obj.material) : DEFAULT_MATERIAL;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = obj.id;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.applyTransform(mesh, obj);
    return mesh;
  }

  updateGeometry(object3D: THREE.Object3D, obj: SceneObject): void {
    if (!(object3D instanceof THREE.Mesh) || !obj.geometry) return;
    const old = object3D.geometry;
    object3D.geometry = this.geometryFactory.create(obj.geometry);
    old.dispose();
  }

  updateMaterial(object3D: THREE.Object3D, obj: SceneObject): void {
    if (!(object3D instanceof THREE.Mesh)) return;
    object3D.material = obj.material ? this.materials.getThreeMaterial(obj.material) : DEFAULT_MATERIAL;
  }

  applyTransform(object3D: THREE.Object3D, obj: SceneObject): void {
    object3D.position.set(...obj.position);
    object3D.rotation.set(...obj.rotation, 'XYZ');
    object3D.scale.set(...obj.scale);
    object3D.visible = obj.visible;
  }

  disposeMesh(object3D: THREE.Object3D): void {
    if (object3D instanceof THREE.Mesh) {
      object3D.geometry.dispose();
    }
  }
}
