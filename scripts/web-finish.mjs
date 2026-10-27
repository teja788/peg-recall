/**
 * Runs after `expo export -p web` (npm run build:web), on Cloudflare Pages or
 * locally: fills the site's own address into dist/index.html, which link
 * previews (WhatsApp, iMessage) need as absolute URLs.
 *
 * The address comes from SITE_URL (set it in the Cloudflare Pages project
 * once the address is known, e.g. https://colorcatch.pages.dev), else from
 * CF_PAGES_URL (the address Cloudflare gives each deployment). With neither,
 * the two lines that need it are dropped and the rest of the page still works.
 *
 * It also fails the build on what would break the site: a placeholder left
 * behind, or a top-level 404.html (Cloudflare Pages then stops sending every
 * unknown path to index.html, and links like /join/482913 would 404).
 */
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve(process.argv[2] ?? 'dist');
const file = path.join(dist, 'index.html');
const site = (process.env.SITE_URL || process.env.CF_PAGES_URL || '').trim().replace(/\/+$/, '');

if (site && !/^https:\/\/[^\s"<>]+$/.test(site)) {
  console.error(`web-finish: SITE_URL must be an https:// address, got "${site}"`);
  process.exit(1);
}

let html = fs.readFileSync(file, 'utf8');
html = site
  ? html.replaceAll('%SITE_URL%', site)
  : html
      .split('\n')
      .filter((line) => !line.includes('%SITE_URL%'))
      .join('\n');
fs.writeFileSync(file, html);

const problems = [];
const left = html.match(/%[A-Z_]+%/g);
if (left) problems.push(`placeholders left in index.html: ${[...new Set(left)].join(', ')}`);
if (fs.existsSync(path.join(dist, '404.html'))) problems.push('dist/404.html exists: it turns off the single-page fallback');
// EXPO_PUBLIC_ values are baked in at build time, and a stale Metro cache can
// carry an old one over (build:web clears it): never ship a local test server
const rooms = process.env.EXPO_PUBLIC_ROOMS_URL ?? '';
if (!/localhost|127\.0\.0\.1/.test(rooms)) {
  const bundles = path.join(dist, '_expo', 'static', 'js', 'web');
  for (const f of fs.existsSync(bundles) ? fs.readdirSync(bundles) : []) {
    if (/wss?:\/\/(localhost|127\.0\.0\.1)/.test(fs.readFileSync(path.join(bundles, f), 'utf8'))) {
      problems.push(`${f} contains a local rooms address that EXPO_PUBLIC_ROOMS_URL did not ask for (stale cache?)`);
    }
  }
}
for (const f of ['_headers', 'manifest.json', 'og.jpg', 'icon-192.png', 'icon-512.png']) {
  if (!fs.existsSync(path.join(dist, f))) problems.push(`missing dist/${f} (is public/ being copied?)`);
}
if (problems.length) {
  for (const p of problems) console.error(`web-finish: ${p}`);
  process.exit(1);
}
console.log(`web-finish: ok (${site ? `site ${site}` : 'no site address: preview image left out'})`);
