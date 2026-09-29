/**
 * Multiplayer co-op protocol for Gridburg.
 *
 * Same-city co-op over WebRTC data channels with manual signalling (copy-paste
 * codes), so the game stays a static site with no server. The host is
 * authoritative for the simulation; guests send map edits which the host
 * applies, and the host broadcasts full city snapshots back.
 *
 * This module is dependency-free (no DOM, no WebRTC, no three.js) so it can be
 * unit-tested in Node. Transport lives in transport.ts, game wiring in sync.ts.
 */

/** Protocol version: bump when a message shape changes. */
export const MP_VERSION = 1;

/** DataChannel messages above this JSON length are split into chunks. */
export const MP_CHUNK = 8000;

/** Distinct colours handed out to players in join order. */
export const PLAYER_COLORS = [
  '#ffd166',
  '#4fb3ff',
  '#62c46a',
  '#e07fb0',
  '#e0a021',
  '#a66fd6',
  '#39b4b0',
  '#e0564a',
] as const;

export interface MpPlayer {
  id: string;
  name: string;
  color: string;
}

/**
 * Every message on the wire carries a `t` discriminator. Large payloads
 * (city snapshots, map edits) travel through chunk envelopes below.
 */
export type MpMessage =
  | { t: 'hello'; v: number; id: string; name: string }
  | { t: 'welcome'; v: number; id: string; color: string; players: MpPlayer[] }
  | { t: 'players'; v: number; players: MpPlayer[] }
  | { t: 'city'; v: number; blob: string }
  | { t: 'map'; v: number; net: unknown; kind: string; rot: string; extras: unknown; parkPaths: unknown; spent: number }
  | { t: 'taxes'; v: number; taxes: [number, number, number, number] }
  | { t: 'tax'; v: number; value: number }
  | { t: 'funding'; v: number; key: string; value: number }
  | { t: 'policy'; v: number; id: string; on: boolean }
  | { t: 'loan'; v: number; action: 'take' | 'repay' }
  | { t: 'districtPolicy'; v: number; district: number; mask: number }
  | { t: 'disasters'; v: number; on: boolean }
  | { t: 'speed'; v: number; value: number }
  | { t: 'cursor'; v: number; id: string; x: number; z: number }
  | { t: 'chat'; v: number; id: string; name: string; text: string }
  | { t: 'notice'; v: number; text: string }
  | { t: 'bye'; v: number; id: string };

/** One piece of a chunked message. */
export interface MpChunk {
  t: '__chunk';
  id: string;
  i: number;
  n: number;
  data: string;
}

export function isChunk(value: unknown): value is MpChunk {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return c.t === '__chunk'
    && typeof c.id === 'string' && c.id.length <= 32
    && Number.isInteger(c.i) && Number.isInteger(c.n)
    && (c.i as number) >= 0 && (c.n as number) > 0 && (c.i as number) < (c.n as number) && (c.n as number) <= 64
    && typeof c.data === 'string' && c.data.length <= MP_CHUNK + 64;
}

export function isMpMessage(value: unknown): value is MpMessage {
  if (!value || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  return typeof m.t === 'string' && (m.v === undefined || m.v === MP_VERSION);
}

/** Short random peer id, safe to show in the UI. */
export function randomId(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  // Math.random is fine here: ids only need to be unique per session, not secret.
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function playerColor(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

/** Tidy display name: trimmed, bounded, never empty. */
export function cleanName(name: string): string {
  const tidy = name.trim().slice(0, 24);
  return tidy || 'Maire';
}

// ---- base64url helpers (work in browsers and in Node) ----

function nodeBuffer(): { from(data: Uint8Array | string, encoding?: string): { toString(encoding?: string): string } } | undefined {
  return (globalThis as unknown as { Buffer?: { from(data: Uint8Array | string, encoding?: string): { toString(encoding?: string): string } } }).Buffer;
}

function bytesToB64Url(bytes: Uint8Array): string {
  const buf = nodeBuffer();
  if (buf) return buf.from(bytes).toString('base64url');
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  const b64 = btoa(s);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64UrlToBytes(str: string): Uint8Array | null {
  try {
    const buf = nodeBuffer();
    if (buf) {
      const decoded = buf.from(str, 'base64url').toString('binary');
      const out = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) out[i] = decoded.charCodeAt(i);
      return out;
    }
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const s = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

export function packBytes(bytes: Uint8Array): string {
  return bytesToB64Url(bytes);
}

export function unpackBytes(str: string, expected: number): Uint8Array | null {
  const bytes = b64UrlToBytes(str);
  if (!bytes || bytes.length !== expected) return null;
  return bytes;
}

// ---- manual signalling: a whole SDP session description as one pasteable code ----

/** A signalling code starts with this so players can tell codes apart. */
export const SIGNAL_PREFIX = 'gridburg1-';

export function encodeSignal(obj: unknown): string {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  return SIGNAL_PREFIX + bytesToB64Url(bytes);
}

export function decodeSignal<T>(code: string): T | null {
  const tidy = code.trim();
  if (!tidy.startsWith(SIGNAL_PREFIX)) return null;
  const bytes = b64UrlToBytes(tidy.slice(SIGNAL_PREFIX.length));
  if (!bytes || bytes.length > 200_000) return null;
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    return null;
  }
}

// ---- chunking for messages larger than one DataChannel send ----

/** Split serialized text into chunk envelopes sharing one id. */
export function chunkText(id: string, text: string): MpChunk[] {
  const out: MpChunk[] = [];
  const n = Math.max(1, Math.ceil(text.length / MP_CHUNK));
  for (let i = 0; i < n; i++) {
    out.push({ t: '__chunk', id, i, n, data: text.slice(i * MP_CHUNK, (i + 1) * MP_CHUNK) });
  }
  return out;
}

/** Reassembles chunk envelopes back into the original text. */
export class ChunkBuffer {
  private parts = new Map<string, { chunks: (string | null)[]; n: number; at: number }>();

  /** Feed one envelope; returns the full text once every piece arrived, else null. */
  feed(chunk: MpChunk): string | null {
    let slot = this.parts.get(chunk.id);
    if (!slot) {
      slot = { chunks: new Array(chunk.n).fill(null), n: chunk.n, at: Date.now() };
      this.parts.set(chunk.id, slot);
    }
    if (chunk.n !== slot.n || chunk.i >= slot.n) return null;
    slot.chunks[chunk.i] = chunk.data;
    if (slot.chunks.some((c) => c === null)) return null;
    this.parts.delete(chunk.id);
    return slot.chunks.join('');
  }

  /** Drop half-received messages older than a minute. */
  prune(): void {
    const now = Date.now();
    for (const [id, slot] of this.parts) {
      if (now - slot.at > 60_000) this.parts.delete(id);
    }
  }
}

/** Parse one incoming DataChannel payload into a protocol message (or null). */
export function parseWire(text: string, chunks: ChunkBuffer): MpMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (isChunk(value)) {
    const full = chunks.feed(value);
    if (full === null) return null;
    try {
      value = JSON.parse(full);
    } catch {
      return null;
    }
  }
  if (!isMpMessage(value)) return null;
  if ((value as { v?: number }).v !== undefined && (value as { v: number }).v !== MP_VERSION) return null;
  // Bound the biggest free-form fields so a broken peer cannot flood memory.
  if (value.t === 'city' && value.blob.length > 1_500_000) return null;
  if (value.t === 'map' && (value.kind.length > 60_000 || value.rot.length > 60_000)) return null;
  if (value.t === 'chat' && value.text.length > 500) return null;
  if (value.t === 'notice' && value.text.length > 500) return null;
  return value;
}

/** Serialize an outgoing message, chunked when it would be too large for one send. */
export function serializeWire(id: string, msg: MpMessage): string[] {
  const text = JSON.stringify(msg);
  if (text.length <= MP_CHUNK) return [text];
  return chunkText(id, text).map((c) => JSON.stringify(c));
}
