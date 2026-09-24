/**
 * US-40. Confirm a deploy is whole: index.html and assets/ describe one build.
 *
 * One deploy left the old index.html in place beside the new bundle, so the
 * app kept loading last week's code and nothing said so. Checking only that
 * index.html's files exist would have passed that, because the old files were
 * still there too. So this checks both directions: everything index.html
 * points at exists, and everything in assets/ is something it points at.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
const html = readFileSync(join(dir, 'index.html'), 'utf8');
const referenced = [...html.matchAll(/\/assets\/([^"']+)/g)].map((m) => m[1]);
const present = readdirSync(join(dir, 'assets'));

const missing = referenced.filter(
  (name) => !existsSync(join(dir, 'assets', name)),
);
const stray = present.filter((name) => !referenced.includes(name));

if (missing.length > 0 || stray.length > 0) {
  console.error('Deploy is not whole. Run npm run deploy again.');
  if (missing.length > 0)
    console.error(`  index.html points at missing: ${missing.join(', ')}`);
  if (stray.length > 0)
    console.error(
      `  assets/ has files index.html does not use: ${stray.join(', ')}`,
    );
  process.exit(1);
}

console.log(
  `Deploy checked: index.html and ${present.length} asset files match.`,
);
