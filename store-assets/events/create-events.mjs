/**
 * Create the In-App Events in store-assets/events/<slug>/event.json in App Store
 * Connect, upload their media and submit them for review (API spec 4.5.1).
 *
 *   node store-assets/events/create-events.mjs                  # dry run, all events
 *   node store-assets/events/create-events.mjs diwali-2026      # dry run, one event
 *   node store-assets/events/create-events.mjs --nomination     # + the featuring nomination (draft)
 *   node store-assets/events/create-events.mjs --yes            # really write
 *
 * Dry run (the default): GETs are real, every write is printed as
 * `METHOD path {json}` and nothing changes. With --yes the same calls are sent.
 * Re-running is safe: an event with the same referenceName, an existing
 * localization or an existing media type is reused, not duplicated.
 *
 * Steps per event: POST /v1/appEvents -> POST /v1/appEventLocalizations per
 * locale -> per localization and asset type (EVENT_CARD, EVENT_DETAILS_PAGE):
 * POST /v1/appEventScreenshots, PUT the uploadOperations, PATCH {uploaded:true},
 * wait for COMPLETE. Then one review submission: reuse the open READY_FOR_REVIEW
 * one or POST /v1/reviewSubmissions, POST /v1/reviewSubmissionItems {appEvent}
 * per event, PATCH {submitted:true}. If that submission also holds other items
 * (the 1.2.1 version), it is not submitted here: release.mjs submit sends all.
 *
 * --nomination: POST /v1/nominations with the JSON block in
 * featuring-nomination.md, linked to the events, as a DRAFT (submitted:false).
 * The owner reads it in ASC (Featuring > Nominations) and clicks Submit.
 */
import { readFileSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const { api } = await import(path.join(os.homedir(), '.claude/skills/ship-ios-app/asc-api.mjs'));
const APP = '6813625311';
const here = path.dirname(new URL(import.meta.url).pathname);
const argv = process.argv.slice(2);
const YES = argv.includes('--yes');
const slugs = argv.filter((a) => !a.startsWith('--'));
const events = (slugs.length ? slugs : ['diwali-2026', 'childrens-day-2026']).map((slug) => ({
  slug,
  ...JSON.parse(readFileSync(path.join(here, slug, 'event.json'), 'utf8')),
}));

let fake = 0;
let writes = 0;
let puts = 0;
/** Sends a write with --yes; otherwise prints it and returns a stand-in response. */
async function write(method, p, body, type = '') {
  writes++;
  console.log(`${method} ${p} ${body ? JSON.stringify(body) : ''}`);
  if (YES) return api(method, p, body);
  return { data: { id: `<new-${type || 'id'}-${++fake}>`, attributes: {} } };
}
const get = (p) => api('GET', p);

/* ---------------------------------------------------------------- checks */
const DAY = 864e5;
const pngSize = (f) => { const b = readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const SIZES = { EVENT_CARD: [1920, 1080], EVENT_DETAILS_PAGE: [1080, 1920] };
for (const e of events) {
  for (const [loc, l] of Object.entries(e.localizations)) {
    for (const [k, max] of [['name', 30], ['shortDescription', 50], ['longDescription', 120]]) {
      if ([...l[k]].length > max) throw new Error(`${e.slug} ${loc} ${k} is ${[...l[k]].length} > ${max}`);
    }
  }
  for (const s of e.territorySchedules) {
    const pub = Date.parse(s.publishStart), start = Date.parse(s.eventStart), end = Date.parse(s.eventEnd);
    if (start - pub > 14 * DAY || pub > start) throw new Error(`${e.slug}: publishStart must be 0-14 days before eventStart`);
    if (end - start > 31 * DAY || end <= start) throw new Error(`${e.slug}: an event lasts at most 31 days`);
    if (pub < Date.now() && YES) console.warn(`! ${e.slug}: publishStart is in the past; it publishes once approved`);
  }
  for (const [type, file] of Object.entries(e.media)) {
    const [w, h] = pngSize(path.join(here, e.slug, file));
    if (w !== SIZES[type][0] || h !== SIZES[type][1]) throw new Error(`${e.slug}/${file} is ${w}x${h}, ${type} needs ${SIZES[type].join('x')}`);
  }
}
console.log(`${YES ? 'WRITING' : 'DRY RUN (add --yes to write)'}: ${events.map((e) => e.slug).join(', ')}\n`);

/* ---------------------------------------------------------------- upload */
async function upload(locId, type, file, existing) {
  if (existing.includes(type)) return console.log(`  = ${type} already uploaded`);
  const size = statSync(file).size;
  const r = await write('POST', '/v1/appEventScreenshots', {
    data: {
      type: 'appEventScreenshots',
      attributes: { fileName: path.basename(file), fileSize: size, appEventAssetType: type },
      relationships: { appEventLocalization: { data: { type: 'appEventLocalizations', id: locId } } },
    },
  }, 'appEventScreenshot');
  const id = r.data.id;
  const ops = r.data.attributes.uploadOperations ?? [{ method: 'PUT', url: '<uploadOperations[].url from the POST response>', offset: 0, length: size, requestHeaders: [] }];
  const bytes = readFileSync(file);
  for (const op of ops) {
    puts++;
    console.log(`${op.method} ${op.url} <${path.basename(file)} bytes ${op.offset}-${op.offset + op.length - 1}>`);
    if (!YES) continue;
    const res = await fetch(op.url, {
      method: op.method,
      headers: Object.fromEntries((op.requestHeaders ?? []).map((h) => [h.name, h.value])),
      body: bytes.subarray(op.offset, op.offset + op.length),
    });
    if (!res.ok) throw new Error(`upload part failed: ${res.status}`);
  }
  await write('PATCH', `/v1/appEventScreenshots/${id}`, { data: { type: 'appEventScreenshots', id, attributes: { uploaded: true } } });
  if (!YES) return;
  for (let i = 0; i < 60; i++) {
    const s = (await get(`/v1/appEventScreenshots/${id}`)).data.attributes.assetDeliveryState?.state;
    if (s === 'COMPLETE') return console.log(`  ${type} processed`);
    if (s === 'FAILED') throw new Error(`${type} processing failed: ${JSON.stringify((await get(`/v1/appEventScreenshots/${id}`)).data.attributes.assetDeliveryState)}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.warn(`! ${type} still processing after 5 min; check ASC before submitting`);
}

/* ---------------------------------------------------------------- events */
const existing = (await get(`/v1/apps/${APP}/appEvents?limit=50`)).data;
const ids = [];
const toSubmit = new Set(); // events still to be reviewed
for (const e of events) {
  console.log(`# ${e.slug} (${e.badge})`);
  let ev = existing.find((x) => x.attributes.referenceName === e.referenceName);
  if (ev) {
    console.log(`  = event exists: ${ev.id} (${ev.attributes.eventState})`);
    // fill fields added to event.json after the event was created (review needs purchaseRequirement)
    const fix = {};
    for (const k of ['purchaseRequirement', 'deepLink']) if (e[k] && ev.attributes[k] !== e[k]) fix[k] = e[k];
    if (Object.keys(fix).length) await write('PATCH', `/v1/appEvents/${ev.id}`, { data: { type: 'appEvents', id: ev.id, attributes: fix } });
  }
  else {
    const attributes = { referenceName: e.referenceName, badge: e.badge, primaryLocale: e.primaryLocale, priority: e.priority, purpose: e.purpose, territorySchedules: e.territorySchedules };
    if (e.deepLink) attributes.deepLink = e.deepLink;
    if (e.purchaseRequirement) attributes.purchaseRequirement = e.purchaseRequirement;
    ev = (await write('POST', '/v1/appEvents', { data: { type: 'appEvents', attributes, relationships: { app: { data: { type: 'apps', id: APP } } } } }, 'appEvent')).data;
  }
  ids.push(ev.id);
  if (ev.attributes?.eventState && !['DRAFT', 'READY_FOR_REVIEW', 'REJECTED'].includes(ev.attributes.eventState)) toSubmit.delete(ev.id);
  else toSubmit.add(ev.id);
  // ASC may create the primary-locale localization together with the event: PATCH that one
  const locs = YES || existing.includes(ev) ? (await get(`/v1/appEvents/${ev.id}/localizations?limit=50`)).data : [];
  for (const [locale, l] of Object.entries(e.localizations)) {
    let loc = locs.find((x) => x.attributes.locale === locale);
    const attributes = { name: l.name, shortDescription: l.shortDescription, longDescription: l.longDescription };
    if (loc) {
      const same = Object.keys(attributes).every((k) => loc.attributes[k] === attributes[k]);
      if (!same) await write('PATCH', `/v1/appEventLocalizations/${loc.id}`, { data: { type: 'appEventLocalizations', id: loc.id, attributes } });
      else console.log(`  = ${locale} text up to date`);
    } else {
      loc = (await write('POST', '/v1/appEventLocalizations', {
        data: { type: 'appEventLocalizations', attributes: { locale, ...attributes }, relationships: { appEvent: { data: { type: 'appEvents', id: ev.id } } } },
      }, `appEventLocalization-${locale}`)).data;
    }
    const have = loc.id.startsWith('<') ? [] : (await get(`/v1/appEventLocalizations/${loc.id}/appEventScreenshots`)).data.map((s) => s.attributes.appEventAssetType);
    for (const [type, file] of Object.entries(e.media)) await upload(loc.id, type, path.join(here, e.slug, file), have);
  }
  if (YES) { // re-read: every locale and both media types must be there
    const back = (await get(`/v1/appEvents/${ev.id}/localizations?limit=50`)).data;
    const missing = Object.keys(e.localizations).filter((l) => !back.some((x) => x.attributes.locale === l));
    console.log(missing.length ? `! missing locales: ${missing}` : `  verified ${back.length} localizations`);
  }
  console.log('');
}

/* ---------------------------------------------------------------- review */
console.log('# review submission');
if (!toSubmit.size) { console.log('  nothing to submit'); }
else {
const open = (await get(`/v1/reviewSubmissions?filter[app]=${APP}&filter[platform]=IOS&filter[state]=READY_FOR_REVIEW&include=items&limit=5`));
let sub = open.data[0];
let others = 0;
if (sub) {
  const items = (await get(`/v1/reviewSubmissions/${sub.id}/items?limit=50`)).data;
  others = items.filter((i) => !i.relationships?.appEvent?.data).length;
  console.log(`  = reusing open submission ${sub.id} (${items.length} items, ${others} not events)`);
} else {
  sub = (await write('POST', '/v1/reviewSubmissions', { data: { type: 'reviewSubmissions', attributes: { platform: 'IOS' }, relationships: { app: { data: { type: 'apps', id: APP } } } } }, 'reviewSubmission')).data;
}
for (const id of toSubmit) {
  await write('POST', '/v1/reviewSubmissionItems', {
    data: { type: 'reviewSubmissionItems', relationships: { reviewSubmission: { data: { type: 'reviewSubmissions', id: sub.id } }, appEvent: { data: { type: 'appEvents', id } } } },
  }, 'reviewSubmissionItem');
}
if (others) console.log(`! not submitting: submission ${sub.id} also holds ${others} other item(s) (the app version?). Submit it with release.mjs submit --yes, which sends the events too.`);
else await write('PATCH', `/v1/reviewSubmissions/${sub.id}`, { data: { type: 'reviewSubmissions', id: sub.id, attributes: { submitted: true } } });
}

/* ---------------------------------------------------------------- nomination */
if (argv.includes('--nomination')) {
  console.log('\n# featuring nomination (draft)');
  const md = readFileSync(path.join(here, 'featuring-nomination.md'), 'utf8');
  const attributes = JSON.parse(md.match(/```json\n([\s\S]*?)\n```/)[1]);
  const drafts = (await get(`/v1/nominations?filter[state]=DRAFT&filter[relatedApps]=${APP}&limit=50`)).data;
  if (drafts.some((n) => n.attributes.name === attributes.name)) console.log(`  = draft "${attributes.name}" exists`);
  else {
    await write('POST', '/v1/nominations', {
      data: {
        type: 'nominations',
        attributes: { ...attributes, submitted: false },
        relationships: {
          relatedApps: { data: [{ type: 'apps', id: APP }] },
        },
      },
    }, 'nomination');
  }
}
console.log(`\n${writes} API write(s) + ${puts} file upload PUT(s) ${YES ? 'sent' : 'planned'}.`);
