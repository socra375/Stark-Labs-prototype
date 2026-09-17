import * as THREE from 'three';
import { Renderer } from './Renderer';
import { Camera } from './Camera';
import { Controls } from './Controls';
import { SceneManager } from '../core/SceneManager';

/** Wires Renderer+Camera+Controls+SceneManager together and drives the render loop. */
export class Viewport {
  readonly renderer: Renderer;
  readonly camera: Camera;
  readonly controls: Controls;
  readonly sceneManager: SceneManager;
  private frameId = 0;
  private extraUpdates: Array<() => void> = [];

  constructor(container: HTMLElement) {
    this.sceneManager = new SceneManager();
    this.renderer = new Renderer(container);
    const { width, height } = this.renderer.size;
    this.camera = new Camera(width / height);
    this.controls = new Controls(this.camera.instance, this.renderer.webgl.domElement);
    this.loop();
  }

  addUpdate(fn: () => void): void {
    this.extraUpdates.push(fn);
  }

  private loop = (): void => {
    this.frameId = requestAnimationFrame(this.loop);
    const { width, height } = this.renderer.size;
    this.camera.setAspect(width, height);
    this.controls.update();
    for (const fn of this.extraUpdates) fn();
    this.renderer.render(this.sceneManager.scene as THREE.Scene, this.camera.instance);
  };

  dispose(): void {
    cancelAnimationFrame(this.frameId);
    this.controls.dispose();
    this.renderer.dispose();
  }
}
