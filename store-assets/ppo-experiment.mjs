/**
 * Product Page Optimization test for Color Catch, created through the App
 * Store Connect API (spec 4.5.1): one experiment, "Colorful first 3 + Bright
 * icon", with
 *   - "Colorful screenshots": every locale x device in store-assets/screenshots-ppo
 *     (made by `capture-screenshots.mjs --set=ppo`), and
 *   - "Bright icon" (only with ICON=1): appIconName "Bright", control screenshots.
 *     The icon must be in the binary that is live on the store, so not before 1.2.1.
 *
 *   node store-assets/ppo-experiment.mjs          # dry run: every write printed as METHOD path json
 *   node store-assets/ppo-experiment.mjs --yes    # create it and upload
 *   ICON=1 node store-assets/ppo-experiment.mjs   # with the icon treatment
 *   TRAFFIC=30 ...                                # a smaller traffic proportion than the max
 *
 * It never starts the experiment and never submits it for review: after --yes,
 * review the test in App Store Connect (Product Page Optimization), then
 * "Submit for Review" (new screenshots need App Review), then start it.
 * Rerunning is safe: an experiment / treatment / localization / screenshot set
 * that already exists (by name, locale, display type) is reused, and a set
 * whose screenshots already match (MD5) is skipped.
 *
 * Credentials: ~/.claude/skills/ship-ios-app/asc-api.mjs (keys in ~/.appstoreconnect).
 */

import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SKILL = path.join(os.homedir(), '.claude/skills/ship-ios-app');
const { api } = await import(pathToFileURL(path.join(SKILL, 'asc-api.mjs')).href);
const { scanShots } = await import(pathToFileURL(path.join(SKILL, 'release.mjs')).href);

const APP_ID = '6813625311';
const NAME = 'Colorful first 3 + Bright icon';
const SHOTS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'screenshots-ppo');
const YES = process.argv.includes('--yes');
const TREATMENTS = [
  { name: 'Colorful screenshots', shots: SHOTS },
  ...(process.env.ICON === '1' ? [{ name: 'Bright icon', appIconName: 'Bright' }] : []),
];
// "No single treatment can receive more traffic than your original product
// page" (Apple, PPO tech talk): with n treatments the max is n / (n + 1).
const MAX_TRAFFIC = Math.floor((100 * TREATMENTS.length) / (TREATMENTS.length + 1));
const TRAFFIC = Number(process.env.TRAFFIC ?? MAX_TRAFFIC);
if (!(TRAFFIC > 0 && TRAFFIC <= MAX_TRAFFIC)) throw new Error(`TRAFFIC must be 1..${MAX_TRAFFIC}`);

/* ------------------------------------------------------------- requests */

const writes = [];
let fakeId = 0;
const rel = (type, id) => ({ data: { type, id } });

async function getAll(p) {
  const out = [];
  for (let url = p; url; ) {
    const r = await api('GET', url);
    out.push(...r.data);
    url = r.links?.next?.replace('https://api.appstoreconnect.apple.com', '') ?? null;
  }
  return out;
}

/** Every non-GET goes through here: printed, and sent only with --yes. */
async function write(method, p, body) {
  writes.push(`${method} ${p.replace(/\/(DRYRUN-\d+|[0-9a-f-]{20,}|\d{6,})(?=\/|$)/g, '/{id}')}`);
  if (!YES) {
    console.log(`${method} ${p} ${body ? JSON.stringify(body) : ''}`);
    return body?.data?.type === 'appScreenshots' && method === 'POST'
      ? { data: { id: `DRYRUN-${++fakeId}`, attributes: { uploadOperations: [{ method: 'PUT', url: '<upload url>', offset: 0, length: body.data.attributes.fileSize, requestHeaders: [] }] } } }
      : { data: { id: `DRYRUN-${++fakeId}` } };
  }
  console.log(`${method} ${p}`);
  return api(method, p, body);
}

/** One uploadOperation: a PUT to Apple's asset host (no auth), as release.mjs does. */
async function upload(op, buf, label) {
  const chunk = buf.subarray(op.offset, op.offset + op.length);
  writes.push(`${op.method} <upload url>`);
  if (!YES) return console.log(`${op.method} <upload url> ${label} bytes ${op.offset}-${op.offset + op.length - 1}`);
  const headers = Object.fromEntries((op.requestHeaders ?? []).map((h) => [h.name, h.value]));
  const res = await fetch(op.url, { method: op.method, headers, body: chunk });
  if (!res.ok) throw new Error(`upload ${label} -> HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

async function waitForAsset(id, label) {
  if (!YES) return;
  for (const t0 = Date.now(); ; ) {
    const a = (await api('GET', `/v1/appScreenshots/${id}?fields[appScreenshots]=assetDeliveryState`)).data.attributes;
    const st = a.assetDeliveryState?.state;
    if (st === 'COMPLETE') return;
    if (st === 'FAILED') throw new Error(`${label}: processing FAILED ${JSON.stringify(a.assetDeliveryState?.errors ?? [])}`);
    if (Date.now() - t0 > 10 * 60 * 1000) throw new Error(`${label}: still ${st} after 10 min`);
    await new Promise((r) => setTimeout(r, 3000));
  }
}

/** The release.mjs pattern: reserve -> PUT the parts -> commit with MD5 -> wait, then set the order. */
async function uploadSet(locId, s) {
  const sets = locId.startsWith('DRYRUN') ? [] : await getAll(`/v1/appStoreVersionExperimentTreatmentLocalizations/${locId}/appScreenshotSets?limit=50`);
  let setId = sets.find((x) => x.attributes.screenshotDisplayType === s.displayType)?.id;
  const existing = setId ? await getAll(`/v1/appScreenshotSets/${setId}/appScreenshots?limit=50`) : [];
  if (existing.length === s.files.length && existing.every((e, i) => e.attributes.sourceFileChecksum === s.files[i].md5)) {
    return console.log(`  ${s.locale}/${s.device}: up to date, skipped`);
  }
  for (const e of existing) await write('DELETE', `/v1/appScreenshots/${e.id}`); // this treatment's own, from an earlier run
  if (!setId) {
    setId = (await write('POST', '/v1/appScreenshotSets', {
      data: {
        type: 'appScreenshotSets',
        attributes: { screenshotDisplayType: s.displayType },
        relationships: { appStoreVersionExperimentTreatmentLocalization: rel('appStoreVersionExperimentTreatmentLocalizations', locId) },
      },
    })).data.id;
  }
  const ids = [];
  for (const f of s.files) {
    const buf = readFileSync(f.path);
    const shot = (await write('POST', '/v1/appScreenshots', {
      data: { type: 'appScreenshots', attributes: { fileName: f.name, fileSize: f.size }, relationships: { appScreenshotSet: rel('appScreenshotSets', setId) } },
    })).data;
    for (const op of shot.attributes.uploadOperations ?? []) await upload(op, buf, `${s.locale}/${s.device}/${f.name}`);
    await write('PATCH', `/v1/appScreenshots/${shot.id}`, {
      data: { type: 'appScreenshots', id: shot.id, attributes: { uploaded: true, sourceFileChecksum: f.md5 } },
    });
    await waitForAsset(shot.id, `${s.locale}/${s.device}/${f.name}`);
    ids.push(shot.id);
  }
  await write('PATCH', `/v1/appScreenshotSets/${setId}/relationships/appScreenshots`, { data: ids.map((id) => ({ type: 'appScreenshots', id })) });
}

/* ----------------------------------------------------------------- main */

console.log(YES ? 'LIVE RUN (--yes): creating in App Store Connect' : 'DRY RUN: nothing is sent; --yes to create');

// 1. validate everything local and remote before the first write
const { sets, errors } = scanShots(SHOTS);
if (errors.length) throw new Error(`screenshots-ppo:\n  ${errors.join('\n  ')}`);
const live = (await getAll(`/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&filter[appVersionState]=READY_FOR_DISTRIBUTION&limit=5`))[0];
if (!live) throw new Error('no version is live on the App Store (a PPO test needs one)');
const liveLocales = new Set((await getAll(`/v1/appStoreVersions/${live.id}/appStoreVersionLocalizations?limit=50`)).map((l) => l.attributes.locale));
const stray = [...new Set(sets.map((s) => s.locale))].filter((l) => !liveLocales.has(l));
if (stray.length) throw new Error(`locales not on the live version ${live.attributes.versionString}: ${stray.join(', ')}`);
const experiments = await getAll(`/v1/apps/${APP_ID}/appStoreVersionExperimentsV2?limit=50`);
console.log(
  `live ${live.attributes.versionString}; ${sets.length} screenshot sets in ${liveLocales.size} locales; ` +
    `existing experiments: ${experiments.map((e) => `"${e.attributes.name}" ${e.attributes.state}`).join(', ') || 'none'}; ` +
    `traffic ${TRAFFIC}% over ${TREATMENTS.length} treatment(s)`,
);

// 2. the experiment (never started here: no PATCH started:true)
let exp = experiments.find((e) => e.attributes.name === NAME);
if (exp && exp.attributes.state !== 'PREPARE_FOR_SUBMISSION') {
  throw new Error(`"${NAME}" is ${exp.attributes.state}: it can no longer be edited`);
}
if (!exp) {
  exp = (await write('POST', '/v2/appStoreVersionExperiments', {
    data: {
      type: 'appStoreVersionExperiments',
      attributes: { name: NAME, platform: 'IOS', trafficProportion: TRAFFIC },
      relationships: { app: rel('apps', APP_ID) },
    },
  })).data;
} else if (exp.attributes.trafficProportion !== TRAFFIC) {
  await write('PATCH', `/v2/appStoreVersionExperiments/${exp.id}`, {
    data: { type: 'appStoreVersionExperiments', id: exp.id, attributes: { trafficProportion: TRAFFIC } },
  });
}

// 3. treatments, their localizations and screenshots
const existingTreatments = exp.id.startsWith('DRYRUN') ? [] : await getAll(`/v2/appStoreVersionExperiments/${exp.id}/appStoreVersionExperimentTreatments?limit=10`);
for (const t of TREATMENTS) {
  console.log(`treatment "${t.name}"`);
  let tr = existingTreatments.find((x) => x.attributes.name === t.name);
  if (!tr) {
    tr = (await write('POST', '/v1/appStoreVersionExperimentTreatments', {
      data: {
        type: 'appStoreVersionExperimentTreatments',
        attributes: { name: t.name, ...(t.appIconName ? { appIconName: t.appIconName } : {}) },
        relationships: { appStoreVersionExperimentV2: rel('appStoreVersionExperiments', exp.id) },
      },
    })).data;
  }
  if (!t.shots) continue; // the icon treatment keeps the original screenshots
  const locs = tr.id.startsWith('DRYRUN') ? [] : await getAll(`/v1/appStoreVersionExperimentTreatments/${tr.id}/appStoreVersionExperimentTreatmentLocalizations?limit=50`);
  for (const locale of [...new Set(sets.map((s) => s.locale))]) {
    let loc = locs.find((l) => l.attributes.locale === locale);
    if (!loc) {
      loc = (await write('POST', '/v1/appStoreVersionExperimentTreatmentLocalizations', {
        data: {
          type: 'appStoreVersionExperimentTreatmentLocalizations',
          attributes: { locale },
          relationships: { appStoreVersionExperimentTreatment: rel('appStoreVersionExperimentTreatments', tr.id) },
        },
      })).data;
    }
    for (const s of sets.filter((x) => x.locale === locale)) await uploadSet(loc.id, s);
  }
}

// 4. summary
const counts = {};
for (const w of writes) counts[w] = (counts[w] ?? 0) + 1;
console.log(`\n${YES ? 'done' : 'planned'}: ${writes.length} writes`);
for (const [k, n] of Object.entries(counts)) console.log(`  ${String(n).padStart(4)}  ${k}`);
console.log('not started, not submitted: review it in App Store Connect > Product Page Optimization, then submit for review and start it there.');
