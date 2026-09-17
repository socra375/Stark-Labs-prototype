import * as THREE from 'three';
import type { AssetRecord, AssetKind } from '../core/types';
import { generateId } from '../utils/ids';

function arrayBufferToBase64(buf: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

const geometryLoader = new THREE.BufferGeometryLoader();

/** Owns AssetRecord blobs (imported/reconstructed geometry, source files, source images) — the
 * one place SceneObject.geometry:{type:'imported'} and ReferenceImage.assetId resolve through.
 * Same CRUD/live-cache discipline as MaterialManager: records are the data model, getGeometry()
 * lazily parses and caches, but always hands out a fresh .clone() so every mesh owns disposable
 * geometry (matches GeometryFactory's per-create() semantics — no accidental sharing). */
export class AssetManager {
  private records = new Map<string, AssetRecord>();
  private geometryCache = new Map<string, THREE.BufferGeometry>();

  insertGeometry(name: string, geometry: THREE.BufferGeometry): AssetRecord {
    // toJSON() on a still-parametric primitive (BoxGeometry, SphereGeometry, ...) serializes only
    // its constructor params, not raw attribute/index data — BufferGeometryLoader.parse() can't
    // read that back. AssetRecords must always hold real buffer data, so normalize through a
    // plain BufferGeometry copy first (a no-op for already-plain geometry from loaders/merges).
    const plain = new THREE.BufferGeometry().copy(geometry);
    const record: AssetRecord = {
      id: generateId('asset'),
      kind: 'geometry',
      mimeType: 'application/json',
      name,
      data: JSON.stringify(plain.toJSON()),
      createdAt: new Date().toISOString(),
    };
    this.records.set(record.id, record);
    return record;
  }

  insertSourceFile(name: string, mimeType: string, buf: ArrayBuffer): AssetRecord {
    return this.insertBinary('sourceFile', name, mimeType, buf);
  }

  insertSourceImage(name: string, mimeType: string, buf: ArrayBuffer): AssetRecord {
    return this.insertBinary('sourceImage', name, mimeType, buf);
  }

  private insertBinary(kind: AssetKind, name: string, mimeType: string, buf: ArrayBuffer): AssetRecord {
    const record: AssetRecord = { id: generateId('asset'), kind, mimeType, name, data: arrayBufferToBase64(buf), createdAt: new Date().toISOString() };
    this.records.set(record.id, record);
    return record;
  }

  /** Re-inserts a fully-formed record (undo, import, library-insert, version restore) without generating a new id. */
  insert(record: AssetRecord): void {
    this.records.set(record.id, record);
  }

  get(id: string): AssetRecord | undefined {
    return this.records.get(id);
  }

  getAll(): AssetRecord[] {
    return [...this.records.values()];
  }

  /** Returns the source binary for a sourceFile/sourceImage asset. */
  getBinary(id: string): ArrayBuffer {
    const record = this.records.get(id);
    if (!record) throw new Error(`AssetRecord not found: ${id}`);
    return base64ToArrayBuffer(record.data);
  }

  /** Returns a fresh, independently-disposable BufferGeometry for a 'geometry' asset. */
  getGeometry(id: string): THREE.BufferGeometry {
    const cached = this.geometryCache.get(id);
    if (cached) return cached.clone();
    const record = this.records.get(id);
    if (!record || record.kind !== 'geometry') throw new Error(`Geometry asset not found: ${id}`);
    const geometry = geometryLoader.parse(JSON.parse(record.data));
    this.geometryCache.set(id, geometry);
    return geometry.clone();
  }

  remove(id: string): void {
    this.records.delete(id);
    const cached = this.geometryCache.get(id);
    if (cached) {
      cached.dispose();
      this.geometryCache.delete(id);
    }
  }

  clear(): void {
    for (const geo of this.geometryCache.values()) geo.dispose();
    this.geometryCache.clear();
    this.records.clear();
  }

  loadAll(records: AssetRecord[]): void {
    this.clear();
    for (const r of records) this.records.set(r.id, { ...r });
  }

  serialize(): AssetRecord[] {
    return this.getAll().map((r) => ({ ...r }));
  }
}
