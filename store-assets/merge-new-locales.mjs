/**
 * Merges store-assets/new-locales/<locale>.json (written per locale by the
 * translation passes) into listing.json and captions.json, then checks every
 * locale against the App Store limits and the words App Review rejected.
 *
 *   node store-assets/merge-new-locales.mjs           # check only, prints the plan
 *   node store-assets/merge-new-locales.mjs --write   # merge
 *
 * nameFallback and research stay in new-locales/ (they are notes, not fields).
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const WRITE = process.argv.includes('--write');
const read = (f) => JSON.parse(readFileSync(path.join(DIR, f), 'utf8'));

const listing = read('listing.json');
const captions = read('captions.json');
const FIELDS = ['name', 'subtitle', 'description', 'keywords', 'promotionalText', 'privacyPolicyUrl', 'supportUrl', 'marketingUrl'];

// Words that got 1.2.1 rejected (2.3.7 price, 2.3.8 audience) or that we never
// say (memory/brain benefits). Names and subtitles get the audience list too.
const PRICE = /\b(free|gratis|gratuit|grátis|kostenlos|zdarma|безкоштовн|бесплатн|no ads|ad-free|ads\b|reklamfri|uden reklamer|uten reklame|bez reklam|без реклам|sans pub|sem anúncios)|ఉచిత|இலவச|ಉಚಿತ|বিনামূল্য|মুফত|मोफत|मुफ़्त/i;
const AUDIENCE = /\b(kids?|child|children|toddler|seniors?|elderly|grandparents?|barn|børn|děti|діт|enfants|crianças|miúdos|idosos|aînés)\b|पिल्लल|పిల్లల|குழந்தை|ಮಕ್ಕಳ|শিশু|বাচ্চা|मुलां/i;
const BENEFIT = /\b(brain|improves? (your )?memory|train your memory|focus)\b/i;
const bytes = (s) => Buffer.byteLength(s ?? '', 'utf8');

const problems = [];
const added = [];
for (const file of readdirSync(path.join(DIR, 'new-locales')).filter((f) => f.endsWith('.json')).sort()) {
  const n = JSON.parse(readFileSync(path.join(DIR, 'new-locales', file), 'utf8'));
  const { locale, listing: l, captions: c } = n;
  const say = (m) => problems.push(`${locale}: ${m}`);
  for (const f of FIELDS) if (!l?.[f]) say(`missing ${f}`);
  if ([...(l.name ?? '')].length > 30) say(`name ${[...l.name].length} > 30`);
  if ([...(l.subtitle ?? '')].length > 30) say(`subtitle ${[...l.subtitle].length} > 30`);
  if ([...(l.promotionalText ?? '')].length > 170) say(`promo ${[...l.promotionalText].length} > 170`);
  if ([...(l.description ?? '')].length > 4000) say('description > 4000');
  if (bytes(l.keywords) > 100) say(`keywords ${bytes(l.keywords)} bytes > 100`);
  if (/,\s/.test(l.keywords ?? '')) say('space after a comma in keywords');
  const nameWords = new Set(`${l.name} ${l.subtitle}`.toLowerCase().split(/[\s:,&·–-]+/u).filter((w) => w.length > 2));
  const dup = (l.keywords ?? '').toLowerCase().split(',').filter((k) => nameWords.has(k));
  if (dup.length) say(`keywords repeat name/subtitle: ${dup.join(', ')}`);
  for (const [field, text] of [['name', l.name], ['subtitle', l.subtitle], ['keywords', l.keywords], ['promo', l.promotionalText], ...Object.entries(c ?? {}).map(([k, v]) => [`caption ${k}`, v])]) {
    if (PRICE.test(text ?? '')) say(`price word in ${field}: ${text}`);
    if (BENEFIT.test(text ?? '')) say(`benefit claim in ${field}: ${text}`);
  }
  for (const [field, text] of [['name', l.name], ['subtitle', l.subtitle], ...Object.entries(c ?? {}).map(([k, v]) => [`caption ${k}`, v])]) {
    if (AUDIENCE.test(text ?? '')) say(`audience word in ${field}: ${text}`);
  }
  if (BENEFIT.test(l.description ?? '')) say('benefit claim in description');
  const shots = Object.keys(captions.captions['en-US']);
  for (const k of shots) if (!c?.[k]) say(`missing caption ${k}`);
  if (listing.locales[locale]) say('already in listing.json (would overwrite)');
  added.push(`${locale}  ${l.name}  |  ${l.subtitle}`);
  listing.locales[locale] = Object.fromEntries(FIELDS.map((f) => [f, l[f]]));
  captions.captions[locale] = Object.fromEntries(shots.map((k) => [k, c?.[k]]));
}

console.log(added.join('\n'));
console.log(problems.length ? `\n${problems.length} problem(s):\n${problems.join('\n')}` : '\nno problems');
if (WRITE && !problems.length) {
  writeFileSync(path.join(DIR, 'listing.json'), `${JSON.stringify(listing, null, 2)}\n`);
  writeFileSync(path.join(DIR, 'captions.json'), `${JSON.stringify(captions, null, 2)}\n`);
  console.log(`merged ${added.length} locale(s) into listing.json and captions.json`);
} else if (WRITE) {
  console.log('not written: fix the problems first');
  process.exitCode = 1;
}
