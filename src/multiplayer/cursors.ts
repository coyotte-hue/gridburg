/**
 * Where the other mayors are looking: one coloured ring per remote player,
 * floating just above the ground. Positions arrive as tile coordinates.
 */
import * as THREE from 'three';
import { GRID } from '../constants.ts';

const RING_INNER = 0.55;
const RING_OUTER = 0.8;

export class RemoteCursors {
  readonly group = new THREE.Group();
  private markers = new Map<string, { mesh: THREE.Mesh; at: number }>();

  set(id: string, x: number, z: number, color: string): void {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const cx = Math.max(0, Math.min(GRID, x)) - GRID / 2;
    const cz = Math.max(0, Math.min(GRID, z)) - GRID / 2;
    let slot = this.markers.get(id);
    if (!slot) {
      const geo = new THREE.RingGeometry(RING_INNER, RING_OUTER, 40);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
      );
      mesh.renderOrder = 4;
      this.group.add(mesh);
      slot = { mesh, at: 0 };
      this.markers.set(id, slot);
    }
    (slot.mesh.material as THREE.MeshBasicMaterial).color.set(color);
    slot.mesh.position.set(cx, 0.18, cz);
    slot.mesh.visible = true;
    slot.at = performance.now();
  }

  remove(id: string): void {
    const slot = this.markers.get(id);
    if (!slot) return;
    this.group.remove(slot.mesh);
    slot.mesh.geometry.dispose();
    (slot.mesh.material as THREE.Material).dispose();
    this.markers.delete(id);
  }

  /** Hide rings that stopped moving (tab closed without saying bye). */
  prune(timeoutMs = 8000): void {
    const now = performance.now();
    for (const slot of this.markers.values()) {
      if (now - slot.at > timeoutMs) slot.mesh.visible = false;
    }
  }

  clear(): void {
    for (const id of [...this.markers.keys()]) this.remove(id);
  }
}
