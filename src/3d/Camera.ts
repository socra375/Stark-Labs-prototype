import * as THREE from 'three';

export class Camera {
  readonly instance: THREE.PerspectiveCamera;

  constructor(aspect: number) {
    this.instance = new THREE.PerspectiveCamera(50, aspect, 0.01, 1000);
    this.instance.position.set(4, 3.5, 6);
    this.instance.lookAt(0, 1, 0);
  }

  setAspect(width: number, height: number): void {
    this.instance.aspect = width / height;
    this.instance.updateProjectionMatrix();
  }
}
