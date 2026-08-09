import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const encodedDir = join(repoRoot, 'design-assets', 'wallpapers', '_encoded');
const outputDir = join(repoRoot, 'design-assets', 'wallpapers');

mkdirSync(outputDir, { recursive: true });

const assets = [
  ['julio-pablo.avif.b64.part', 'julio-pablo.avif'],
  ['sarays.avif.b64.part', 'sarays.avif'],
];

for (const [prefix, outputName] of assets) {
  const parts = readdirSync(encodedDir)
    .filter((name) => name.startsWith(prefix))
    .sort();

  if (!parts.length) {
    throw new Error(`No encoded parts found for ${outputName}`);
  }

  const base64 = parts
    .map((name) => readFileSync(join(encodedDir, name), 'utf8').trim())
    .join('');

  const bytes = Buffer.from(base64, 'base64');
  const outputPath = join(outputDir, outputName);
  writeFileSync(outputPath, bytes);
  console.log(`${outputName}: ${bytes.length} bytes -> ${outputPath}`);
}
