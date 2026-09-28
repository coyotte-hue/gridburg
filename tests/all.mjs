import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
for (const suite of ['i18n', 'multiplayer', 'park-paths', 'bench-scale', 'taxi', 'street-pace', 'run', 'streets-render', 'bike-lanes', 'airports', 'parks', 'trolley', 'placement-integration', 'road-snap', 'road-edit', 'lots-angled', 'lanes', 'lane-traffic', 'signals', 'levels']) {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(`./${suite}.mjs`, import.meta.url))], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
