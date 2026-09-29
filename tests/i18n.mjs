import { registerHooks } from 'node:module';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import assert from 'node:assert/strict';
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) {
    const candidate = new URL(`${specifier}.ts`, context.parentURL);
    if (existsSync(candidate)) return nextResolve(candidate.href, context);
  }
  return nextResolve(specifier, context);
}});
const SRC = new URL('../src/', import.meta.url).pathname.replace(/^\//, '');
const { applyLang, getLang, t, inspectorName, translateInspectorText, translateUiMessage } = await import('../src/i18n.ts');

let checks = 0;
const check = (ok, what) => { assert.ok(ok, what); checks++; };

// English is the fallback: switching language must never change what English shows.
applyLang('en');
check(getLang() === 'en', 'English is a language');
const inEnglish = ['Ready to zone or build', 'Filters 95% of effluent with full electricity. Power shortages reduce filtration.',
  'Visitor appeal: ×1.23 (parks and waterfront raise it)', 'Operating', 'Level 1 → 2'];
for (const s of inEnglish) check(translateInspectorText(s) === s, `English leaves "${s}" alone`);
check(translateUiMessage('Not enough money') === 'Not enough money', 'English leaves notices alone');
check(inspectorName('Coal plant') === 'Coal plant', 'English leaves building names alone');

applyLang('fr');
check(getLang() === 'fr', 'French is a language');

// The strings the inspector, toasts and building titles hand to the translator. Each one was
// found untranslated in French at least once, so they are pinned here.
const inFrench = [
  ['Ready to zone or build', 'Prêt à zoner ou à construire'],
  ['Filters 95% of effluent with full electricity. Power shortages reduce filtration.', 'Filtre 95 % des effluents'],
  // The multiplier, not a currency: the inspector prints ×1.23, and the pattern used to want a $.
  ['Visitor appeal: ×1.23 (parks and waterfront raise it)', 'Attrait touristique : ×1.23'],
  ['Visitor appeal: ×0.50 (parks and waterfront raise it)', 'Attrait touristique : ×0.50'],
  ['Operating', 'En service'],
  ['Level 1 → 2', 'Niveau 1 → 2'],
  ['Capacity: 1450 power', 'Capacité : 1450 électricité'],
];
for (const [en, start] of inFrench) {
  const fr = translateInspectorText(en);
  check(fr !== en && fr.startsWith(start), `translated to French: "${en}" -> "${fr}"`);
}
for (const [en, fr] of [['Not enough money', 'Fonds insuffisants'], ['Nothing to undo', 'Rien à annuler']])
  check(translateUiMessage(en) === fr, `notice translated: "${en}" -> "${fr}"`);

// A tile with no building on it is still named in the inspector's own words.
for (const [en, fr] of [['River', 'Rivière'], ['Road', 'Route'], ['Unzoned land', 'Terrain non zoné']])
  check(inspectorName(en) === fr, `ground named in French: "${en}" -> "${fr}"`);
// Services and zones keep resolving through the same call.
check(inspectorName('Coal plant') === 'Centrale à charbon', 'a service is still named in French');
check(inspectorName('Residential') === 'Résidentiel', 'a zone is still named in French');
check(inspectorName('Nothing at all') === 'Nothing at all', 'an unknown name falls back to English');

// Every key asked for with t() must exist, or the interface shows the raw key to the player.
const sources = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (extname(p) === '.ts') sources.push(p);
  }
})(SRC);
const table = readFileSync(join(SRC, 'i18n.ts'), 'utf8');
const declared = new Set([...table.matchAll(/'([A-Za-z0-9_.]+)':\s*\{\s*en:/g)].map(m => m[1]));
const used = new Set();
for (const file of sources) for (const m of readFileSync(file, 'utf8').matchAll(/\bt\(\s*'([A-Za-z0-9_.]+)'/g)) used.add(m[1]);
const missing = [...used].filter(k => !declared.has(k));
assert.equal(missing.length, 0, `t() is called with keys the table never declares: ${missing.join(', ')}`);
checks++;

// Every declared key needs both languages filled in.
const half = [...table.matchAll(/'([A-Za-z0-9_.]+)':\s*\{\s*en:\s*'((?:[^'\\]|\\.)*)'\s*,\s*fr:\s*'((?:[^'\\]|\\.)*)'\s*\}/g)]
  .filter(m => !m[2].trim() || !m[3].trim()).map(m => m[1]);
assert.equal(half.length, 0, `keys missing an English or French string: ${half.join(', ')}`);
checks++;

applyLang('en');
console.log(`i18n: ${checks} checks passed. Inspector details, notices, building and ground names translate, and every t() key exists.`);
