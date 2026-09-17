import * as THREE from 'three';

/** Pointer -> object picking against a root group. Returns the SceneObject id of the nearest hit mesh, if any. */
export class PickRaycaster {
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();

  pick(event: PointerEvent, domElement: HTMLElement, camera: THREE.Camera, root: THREE.Object3D): string | null {
    const rect = domElement.getBoundingClientRect();
    this.ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.ndc, camera);
    // Only meshes (leaf SceneObjects) carry geometry, so the first hit's own name is
    // always the SceneObject id directly — group wrappers have no geometry to intersect.
    const hits = this.raycaster.intersectObjects(root.children, true);
    return hits.length ? hits[0].object.name || null : null;
  }
}
