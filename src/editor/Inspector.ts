import type { EventBus } from '../core/EventBus';
import type { AppState } from '../core/AppState';
import type { ObjectManager } from '../core/ObjectManager';
import type { Vec3 } from '../core/types';
import { signal, type Signal } from '../ui/reactive/Store';

export interface InspectorFields {
  id: Signal<string | null>;
  name: Signal<string>;
  type: Signal<string>;
  positionX: Signal<number>; positionY: Signal<number>; positionZ: Signal<number>;
  rotationXDeg: Signal<number>; rotationYDeg: Signal<number>; rotationZDeg: Signal<number>;
  scaleX: Signal<number>; scaleY: Signal<number>; scaleZ: Signal<number>;
  visible: Signal<boolean>;
  locked: Signal<boolean>;
}

const RAD = Math.PI / 180;

/** Two-way binding between the single selected SceneObject and numeric inspector fields. */
export class Inspector {
  readonly fields: InspectorFields = {
    id: signal<string | null>(null),
    name: signal(''),
    type: signal(''),
    positionX: signal(0), positionY: signal(0), positionZ: signal(0),
    rotationXDeg: signal(0), rotationYDeg: signal(0), rotationZDeg: signal(0),
    scaleX: signal(1), scaleY: signal(1), scaleZ: signal(1),
    visible: signal(true),
    locked: signal(false),
  };

  private currentId: string | null = null;
  private syncing = false;

  constructor(private bus: EventBus, private state: AppState, private objects: ObjectManager) {
    this.state.selection.subscribe((ids) => this.onSelectionChanged(ids));
    this.bus.on('object:updated', ({ objectId }) => {
      if (objectId === this.currentId) this.refresh();
    });

    this.wireWrite(this.fields.name, (v) => this.objects.update(this.currentId!, { name: v }));
    this.wireWrite(this.fields.positionX, (v) => this.patchPosition(0, v));
    this.wireWrite(this.fields.positionY, (v) => this.patchPosition(1, v));
    this.wireWrite(this.fields.positionZ, (v) => this.patchPosition(2, v));
    this.wireWrite(this.fields.rotationXDeg, (v) => this.patchRotation(0, v));
    this.wireWrite(this.fields.rotationYDeg, (v) => this.patchRotation(1, v));
    this.wireWrite(this.fields.rotationZDeg, (v) => this.patchRotation(2, v));
    this.wireWrite(this.fields.scaleX, (v) => this.patchScale(0, v));
    this.wireWrite(this.fields.scaleY, (v) => this.patchScale(1, v));
    this.wireWrite(this.fields.scaleZ, (v) => this.patchScale(2, v));
    this.wireWrite(this.fields.visible, (v) => this.objects.update(this.currentId!, { visible: v }));
    this.wireWrite(this.fields.locked, (v) => this.objects.update(this.currentId!, { locked: v }));
  }

  private wireWrite<T>(sig: Signal<T>, write: (v: T) => void): void {
    sig.subscribe((v) => {
      if (this.syncing || !this.currentId) return;
      write(v);
    });
  }

  private patchPosition(axis: 0 | 1 | 2, value: number): void {
    const obj = this.objects.getOrThrow(this.currentId!);
    const pos: Vec3 = [...obj.position];
    pos[axis] = value;
    this.objects.update(this.currentId!, { position: pos });
  }

  private patchRotation(axis: 0 | 1 | 2, valueDeg: number): void {
    const obj = this.objects.getOrThrow(this.currentId!);
    const rot: Vec3 = [...obj.rotation];
    rot[axis] = valueDeg * RAD;
    this.objects.update(this.currentId!, { rotation: rot });
  }

  private patchScale(axis: 0 | 1 | 2, value: number): void {
    const obj = this.objects.getOrThrow(this.currentId!);
    const scale: Vec3 = [...obj.scale];
    scale[axis] = value;
    this.objects.update(this.currentId!, { scale });
  }

  private onSelectionChanged(ids: string[]): void {
    this.currentId = ids.length === 1 ? ids[0] : null;
    this.refresh();
  }

  refresh(): void {
    this.syncing = true;
    const obj = this.currentId ? this.objects.get(this.currentId) : undefined;
    if (!obj) {
      this.fields.id.set(null);
      this.fields.name.set('');
      this.fields.type.set('');
    } else {
      this.fields.id.set(obj.id);
      this.fields.name.set(obj.name);
      this.fields.type.set(obj.geometry?.type ?? obj.type);
      this.fields.positionX.set(obj.position[0]); this.fields.positionY.set(obj.position[1]); this.fields.positionZ.set(obj.position[2]);
      this.fields.rotationXDeg.set(obj.rotation[0] / RAD); this.fields.rotationYDeg.set(obj.rotation[1] / RAD); this.fields.rotationZDeg.set(obj.rotation[2] / RAD);
      this.fields.scaleX.set(obj.scale[0]); this.fields.scaleY.set(obj.scale[1]); this.fields.scaleZ.set(obj.scale[2]);
      this.fields.visible.set(obj.visible);
      this.fields.locked.set(obj.locked);
    }
    this.syncing = false;
  }
}
