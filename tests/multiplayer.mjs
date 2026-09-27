import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) {
    const candidate = new URL(`${specifier}.ts`, context.parentURL);
    if (existsSync(candidate)) return nextResolve(candidate.href, context);
  }
  return nextResolve(specifier, context);
}});
const P = await import('../src/multiplayer/protocol.ts');
let checks = 0;
function test(name, fn) { if (process.env.ONLY && !name.includes(process.env.ONLY)) return; fn(); checks++; console.log(`✓ ${name}`); }

test('peer ids are short, unique and URL-safe', () => {
  const ids = new Set(Array.from({ length: 200 }, () => P.randomId()));
  assert.equal(ids.size, 200);
  for (const id of ids) assert.match(id, /^[a-z2-9]{8}$/);
});

test('mayor names are trimmed, bounded and never empty', () => {
  assert.equal(P.cleanName('  Camille  '), 'Camille');
  assert.equal(P.cleanName('   '), 'Maire');
  assert.equal(P.cleanName('x'.repeat(99)).length, 24);
});

test('player colours cycle without repeating neighbours', () => {
  assert.equal(P.playerColor(0), P.PLAYER_COLORS[0]);
  assert.equal(P.playerColor(P.PLAYER_COLORS.length), P.PLAYER_COLORS[0]);
  assert.notEqual(P.playerColor(0), P.playerColor(1));
});

test('signalling codes round-trip and reject strangers', () => {
  const sdp = { type: 'offer', sdp: 'v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\n' };
  const code = P.encodeSignal(sdp);
  assert.ok(code.startsWith(P.SIGNAL_PREFIX));
  assert.deepEqual(P.decodeSignal(code), sdp);
  assert.equal(P.decodeSignal('hello world'), null);
  assert.equal(P.decodeSignal('gridburg1-!!!'), null);
  assert.equal(P.decodeSignal(''), null);
});

test('tile bytes pack into URL-safe text and check their length', () => {
  const tiles = new Uint8Array(6400);
  for (let i = 0; i < tiles.length; i++) tiles[i] = i % 251;
  const packed = P.packBytes(tiles);
  assert.match(packed, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(P.unpackBytes(packed, 6400), tiles);
  assert.equal(P.unpackBytes(packed, 6399), null);
  assert.equal(P.unpackBytes('!!!', 6400), null);
});

test('large messages split into chunks and reassemble out of order', () => {
  const text = '0123456789abcdef'.repeat(2000);
  const chunks = P.chunkText('m-1', text);
  assert.ok(chunks.length > 3);
  assert.ok(chunks.every(P.isChunk));
  const buf = new P.ChunkBuffer();
  let full = null;
  for (const c of [...chunks].reverse()) full = buf.feed(c) ?? full;
  // Reversed arrival still reassembles once every piece landed.
  assert.equal(full, text);
  assert.equal(P.isChunk({ t: '__chunk', id: 'x', i: 99, n: 2, data: '' }), false);
  assert.equal(P.isChunk({ t: 'city' }), false);
});

test('city, map, chat and cursor messages survive the wire', () => {
  const buf = new P.ChunkBuffer();
  const roundtrip = (msg) => {
    const parts = P.serializeWire('m-x', msg);
    let out = null;
    for (const part of parts) {
      const parsed = P.parseWire(part, buf);
      if (parsed) out = parsed;
    }
    return out;
  };
  const city = { t: 'city', v: 1, blob: 'abc123_-'.repeat(3000) };
  assert.deepEqual(roundtrip(city), city);
  const map = { t: 'map', v: 1, net: { nodes: [], segs: [] }, kind: 'AA', rot: 'AA', extras: {}, parkPaths: [], spent: 120 };
  assert.deepEqual(roundtrip(map), map);
  const chat = { t: 'chat', v: 1, id: 'a1b2c3d4', name: 'Camille', text: 'On zone au nord ?' };
  assert.deepEqual(roundtrip(chat), chat);
  const cursor = { t: 'cursor', v: 1, id: 'a1b2c3d4', x: 12.5, z: 40 };
  assert.deepEqual(roundtrip(cursor), cursor);
});

test('the wire rejects garbage, wrong versions and floods', () => {
  const buf = new P.ChunkBuffer();
  assert.equal(P.parseWire('not json', buf), null);
  assert.equal(P.parseWire('{"t":"city","v":999,"blob":"x"}', buf), null);
  assert.equal(P.parseWire(JSON.stringify({ t: 'city', v: 1, blob: 'x'.repeat(2_000_000) }), buf), null);
  assert.equal(P.parseWire(JSON.stringify({ t: 'chat', v: 1, id: 'a', name: 'n', text: 'x'.repeat(600) }), buf), null);
});

console.log(`multiplayer: ${checks} checks passed`);
