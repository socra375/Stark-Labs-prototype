import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

export type GizmoMode = 'translate' | 'rotate' | 'scale';

/** Wraps THREE.TransformControls: mode switching, snapping, and drag lifecycle callbacks. */
export class TransformGizmo {
  readonly controls: TransformControls;
  readonly helper: THREE.Object3D;
  onDragStart?: (object3D: THREE.Object3D) => void;
  onChange?: (object3D: THREE.Object3D) => void;
  onDragEnd?: (object3D: THREE.Object3D) => void;
  private orbitEnable: (enabled: boolean) => void;

  constructor(camera: THREE.Camera, domElement: HTMLElement, scene: THREE.Scene, orbitEnable: (enabled: boolean) => void) {
    this.orbitEnable = orbitEnable;
    this.controls = new TransformControls(camera, domElement);
    this.helper = this.controls.getHelper();
    scene.add(this.helper);

    this.controls.addEventListener('mouseDown', () => {
      this.orbitEnable(false);
      if (this.controls.object) this.onDragStart?.(this.controls.object);
    });
    this.controls.addEventListener('objectChange', () => {
      if (this.controls.object) this.onChange?.(this.controls.object);
    });
    this.controls.addEventListener('mouseUp', () => {
      this.orbitEnable(true);
      if (this.controls.object) this.onDragEnd?.(this.controls.object);
    });
  }

  attach(object3D: THREE.Object3D): void {
    this.controls.attach(object3D);
  }

  detach(): void {
    this.controls.detach();
  }

  setMode(mode: GizmoMode): void {
    this.controls.setMode(mode);
  }

  setSnap(enabled: boolean, translateStep = 0.25, rotateStepDeg = 15): void {
    this.controls.setTranslationSnap(enabled ? translateStep : null);
    this.controls.setRotationSnap(enabled ? THREE.MathUtils.degToRad(rotateStepDeg) : null);
    this.controls.setScaleSnap(enabled ? 0.1 : null);
  }

  setSpace(space: 'local' | 'world'): void {
    this.controls.setSpace(space);
  }

  get isDragging(): boolean {
    return this.controls.dragging;
  }

  dispose(): void {
    this.controls.dispose();
  }
}
