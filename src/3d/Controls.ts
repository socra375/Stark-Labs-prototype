import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class Controls {
  readonly orbit: OrbitControls;

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.orbit = new OrbitControls(camera, domElement);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.08;
    this.orbit.target.set(0, 1, 0);
    this.orbit.update();
  }

  setEnabled(enabled: boolean): void {
    this.orbit.enabled = enabled;
  }

  update(): void {
    this.orbit.update();
  }

  dispose(): void {
    this.orbit.dispose();
  }
}
