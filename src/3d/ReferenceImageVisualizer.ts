import * as THREE from 'three';
import type { EventBus } from '../core/EventBus';
import type { ReferenceImageManager } from '../editor/ReferenceImageManager';
import type { AssetManager } from './AssetManager';
import type { ReferenceImage } from '../core/types';

/**
 * Mounts a THREE.Mesh (PlaneGeometry + MeshBasicMaterial) per ReferenceImage, kept live via
 * EventBus events — combines AssemblyVisualizer's event-driven mount/unmount pattern with
 * SceneSync's per-id `mounted` map idiom. Reference images are never SceneObjects, so this is a
 * parallel mount path entirely separate from SceneSync/ObjectManager.
 */
export class ReferenceImageVisualizer {
  private group = new THREE.Group();
  private mounted = new Map<string, THREE.Mesh>();

  constructor(
    private bus: EventBus,
    private referenceImages: ReferenceImageManager,
    private assets: AssetManager,
    scene: THREE.Scene,
  ) {
    this.group.name = 'referenceImages';
    scene.add(this.group);
    this.bus.on('referenceImage:created', ({ referenceImage }) => this.mount(referenceImage));
    this.bus.on('referenceImage:updated', ({ referenceImage }) => this.applyTransform(referenceImage));
    this.bus.on('referenceImage:removed', ({ referenceImageId }) => this.unmount(referenceImageId));
    this.bus.on('scene:cleared', () => this.unmountAll());
    this.bus.on('scene:loaded', () => this.rebuildAll());
  }

  getObject3D(id: string): THREE.Object3D | undefined {
    return this.mounted.get(id);
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  private mount(ref: ReferenceImage): void {
    if (this.mounted.has(ref.id)) return;
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: ref.opacity, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = ref.id;
    this.applyTransformTo(mesh, ref);
    this.group.add(mesh);
    this.mounted.set(ref.id, mesh);

    // The plane is transformable/selectable immediately; the photo texture fills in once decoded.
    const record = this.assets.get(ref.assetId);
    if (record) {
      const buf = this.assets.getBinary(ref.assetId);
      const blob = new Blob([buf], { type: record.mimeType });
      const url = URL.createObjectURL(blob);
      new THREE.TextureLoader().load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          material.map = texture;
          material.needsUpdate = true;
          URL.revokeObjectURL(url);
        },
        undefined,
        () => URL.revokeObjectURL(url),
      );
    }
  }

  private applyTransform(ref: ReferenceImage): void {
    const mesh = this.mounted.get(ref.id);
    if (!mesh) return;
    this.applyTransformTo(mesh, ref);
  }

  private applyTransformTo(mesh: THREE.Mesh, ref: ReferenceImage): void {
    mesh.position.set(...ref.position);
    mesh.quaternion.set(...ref.rotation);
    mesh.scale.set(...ref.scale);
    mesh.visible = ref.visible;
    (mesh.material as THREE.MeshBasicMaterial).opacity = ref.opacity;
  }

  private unmount(id: string): void {
    const mesh = this.mounted.get(id);
    if (!mesh) return;
    mesh.removeFromParent();
    mesh.geometry.dispose();
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.map?.dispose();
    material.dispose();
    this.mounted.delete(id);
  }

  private unmountAll(): void {
    for (const id of [...this.mounted.keys()]) this.unmount(id);
  }

  private rebuildAll(): void {
    this.unmountAll();
    for (const ref of this.referenceImages.getAll()) this.mount(ref);
  }
}
