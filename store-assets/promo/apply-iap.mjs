/**
 * Changes to the "Unlock everything" IAP (6817725344, com.raviteja.pegrecall.unlock),
 * following iap-plan.md. API spec 4.5.1.
 *
 *   node store-assets/promo/apply-iap.mjs --names            # dry run
 *   node store-assets/promo/apply-iap.mjs --india-price --yes
 *
 *   --names           new display name + description in the 20 store locales
 *                     (iap-localizations.json). An APPROVED IAP is edited through
 *                     a new IAP version: POST /v1/inAppPurchaseVersions, then
 *                     PATCH/POST /v2/inAppPurchaseLocalizations on that version,
 *                     then the version goes to review (added to the open review
 *                     submission, e.g. the one for 1.2.1).
 *   --india-price     IND Rs 199 -> Rs 99. Re-POSTs the price schedule with the USA
 *                     base ($2.99) and every other manual price exactly as now.
 *   --family-sharing  familySharable=true (irreversible). Skipped when already on.
 *   --offer-codes     an offer code that makes the unlock free in every territory,
 *                     plus a custom code with a redemption limit and expiry.
 *                     CODE=COLORCATCH26 LIMIT=500 DAYS=30 override the defaults.
 *
 * Dry run (the default): GETs are real, every write is printed as
 * `METHOD path {json}`. With --yes the writes are sent, and each step re-reads
 * what it changed and prints whether it stuck.
 */
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const { api } = await import(path.join(os.homedir(), '.claude/skills/ship-ios-app/asc-api.mjs'));
const IAP = '6817725344';
const APP = '6813625311';
const here = path.dirname(new URL(import.meta.url).pathname);
const argv = process.argv.slice(2);
const YES = argv.includes('--yes');
const steps = ['--names', '--india-price', '--family-sharing', '--offer-codes'].filter((f) => argv.includes(f));
if (!steps.length) { console.error('pick at least one of --names --india-price --family-sharing --offer-codes'); process.exit(1); }

let fake = 0;
let writes = 0;
async function write(method, p, body, type = 'id') {
  writes++;
  console.log(`${method} ${p} ${body ? JSON.stringify(body) : ''}`);
  if (YES) return api(method, p, body);
  return { data: { id: `<new-${type}-${++fake}>`, attributes: {} } };
}
const get = (p) => api('GET', p);
async function all(p) {
  let r = await get(p);
  const data = [...r.data], included = [...(r.included ?? [])];
  while (r.links?.next) {
    r = await get(r.links.next.replace('https://api.appstoreconnect.apple.com', ''));
    data.push(...r.data);
    included.push(...(r.included ?? []));
  }
  return { data, included };
}
const check = (ok, what) => console.log(ok ? `  verified: ${what}` : `! NOT applied: ${what}`);
console.log(`${YES ? 'WRITING' : 'DRY RUN (add --yes to write)'}: ${steps.join(' ')}\n`);

/* ------------------------------------------------------------------ names */
if (steps.includes('--names')) {
  console.log('# --names');
  const want = JSON.parse(readFileSync(path.join(here, 'iap-localizations.json'), 'utf8'));
  for (const [l, v] of Object.entries(want)) {
    if ([...v.name].length > 30 || [...v.description].length > 55) throw new Error(`${l}: name <= 30, description <= 55`);
  }
  const versions = (await get(`/v2/inAppPurchases/${IAP}/versions`)).data;
  let ver = versions.find((v) => v.attributes.state === 'PREPARE_FOR_SUBMISSION');
  let locs = [];
  if (ver) {
    console.log(`  = editable version ${ver.attributes.version} exists (${ver.id})`);
    locs = (await get(`/v1/inAppPurchaseVersions/${ver.id}/localizations?limit=50`)).data;
  } else {
    ver = (await write('POST', '/v1/inAppPurchaseVersions', { data: { type: 'inAppPurchaseVersions', relationships: { inAppPurchase: { data: { type: 'inAppPurchases', id: IAP } } } } }, 'inAppPurchaseVersion')).data;
    locs = YES
      ? (await get(`/v1/inAppPurchaseVersions/${ver.id}/localizations?limit=50`)).data
      // dry run: assume the new version starts with a copy of today's localizations
      : (await get(`/v2/inAppPurchases/${IAP}/inAppPurchaseLocalizations?limit=50`)).data.map((x) => ({ ...x, id: `<copied-${x.attributes.locale}>` }));
  }
  for (const [locale, v] of Object.entries(want)) {
    const cur = locs.find((x) => x.attributes.locale === locale);
    if (cur && cur.attributes.name === v.name && cur.attributes.description === v.description) { console.log(`  = ${locale} up to date`); continue; }
    if (cur) await write('PATCH', `/v2/inAppPurchaseLocalizations/${cur.id}`, { data: { type: 'inAppPurchaseLocalizations', id: cur.id, attributes: { name: v.name, description: v.description } } });
    else await write('POST', '/v2/inAppPurchaseLocalizations', { data: { type: 'inAppPurchaseLocalizations', attributes: { locale, name: v.name, description: v.description }, relationships: { version: { data: { type: 'inAppPurchaseVersions', id: ver.id } } } } }, `loc-${locale}`);
  }
  if (YES) {
    const back = (await get(`/v1/inAppPurchaseVersions/${ver.id}/localizations?limit=50`)).data;
    const bad = Object.entries(want).filter(([l, v]) => !back.some((x) => x.attributes.locale === l && x.attributes.name === v.name && x.attributes.description === v.description));
    check(!bad.length, `${Object.keys(want).length} localizations${bad.length ? ` (wrong: ${bad.map(([l]) => l)})` : ''}`);
  }
  // to review: with the app version when one is open, else on its own
  const open = (await get(`/v1/reviewSubmissions?filter[app]=${APP}&filter[platform]=IOS&filter[state]=READY_FOR_REVIEW&limit=5`)).data[0];
  if (open) {
    await write('POST', '/v1/reviewSubmissionItems', { data: { type: 'reviewSubmissionItems', relationships: { reviewSubmission: { data: { type: 'reviewSubmissions', id: open.id } }, inAppPurchaseVersion: { data: { type: 'inAppPurchaseVersions', id: ver.id } } } } }, 'reviewSubmissionItem');
    console.log(`  (added to open submission ${open.id}; it goes to review when that submission is submitted)`);
  } else {
    console.log('  no open review submission yet (1.2.1 not prepared?). The new names mention 4 players, which ships in 1.2.1,');
    console.log('  so attach this IAP version to the 1.2.1 submission. Run this again once that submission exists, or add it in ASC.');
  }
  console.log('');
}

/* ----------------------------------------------------------- india price */
if (steps.includes('--india-price')) {
  console.log('# --india-price');
  const sched = await get(`/v2/inAppPurchases/${IAP}/iapPriceSchedule?include=baseTerritory`);
  const base = sched.data.relationships.baseTerritory.data.id;
  const man = await all(`/v1/inAppPurchasePriceSchedules/${IAP}/manualPrices?include=inAppPurchasePricePoint,territory&limit=200`);
  const price = (pp) => man.included.find((x) => x.id === pp)?.attributes.customerPrice;
  const current = man.data
    .filter((p) => !p.attributes.endDate) // the prices in force now
    .map((p) => ({ territory: p.relationships.territory.data.id, point: p.relationships.inAppPurchasePricePoint.data.id }));
  const ind = (await all(`/v2/inAppPurchases/${IAP}/pricePoints?filter[territory]=IND&limit=200`)).data.find((x) => +x.attributes.customerPrice === 99);
  if (!ind) throw new Error('no IND Rs 99 price point');
  const usa = current.find((c) => c.territory === 'USA');
  console.log(`  base ${base}, USA ${price(usa.point)} USD, IND ${price(current.find((c) => c.territory === 'IND')?.point)} -> 99 INR (point ${ind.id}), ${current.length} manual prices kept`);
  if (base !== 'USA' || price(usa.point) !== '2.99') throw new Error('expected USA base at 2.99; re-check before changing prices');
  const next = current.map((c) => (c.territory === 'IND' ? { ...c, point: ind.id } : c));
  if (current.find((c) => c.territory === 'IND')?.point === ind.id) console.log('  = IND is already Rs 99');
  else {
    await write('POST', '/v1/inAppPurchasePriceSchedules', {
      data: {
        type: 'inAppPurchasePriceSchedules',
        relationships: {
          inAppPurchase: { data: { type: 'inAppPurchases', id: IAP } },
          baseTerritory: { data: { type: 'territories', id: 'USA' } },
          manualPrices: { data: next.map((c) => ({ type: 'inAppPurchasePrices', id: `\${${c.territory}}` })) },
        },
      },
      included: next.map((c) => ({
        type: 'inAppPurchasePrices',
        id: `\${${c.territory}}`,
        attributes: { startDate: null },
        relationships: {
          inAppPurchaseV2: { data: { type: 'inAppPurchases', id: IAP } },
          inAppPurchasePricePoint: { data: { type: 'inAppPurchasePricePoints', id: c.point } },
        },
      })),
    });
    if (YES) {
      const back = await all(`/v1/inAppPurchasePriceSchedules/${IAP}/manualPrices?include=inAppPurchasePricePoint,territory&limit=200`);
      const now = back.data.filter((p) => !p.attributes.endDate).map((p) => `${p.relationships.territory.data.id}:${p.relationships.inAppPurchasePricePoint.data.id}`).sort();
      const exp = next.map((c) => `${c.territory}:${c.point}`).sort();
      check(JSON.stringify(now) === JSON.stringify(exp), `${exp.length} manual prices, IND Rs 99, all others unchanged`);
    }
  }
  console.log('');
}

/* --------------------------------------------------------- family sharing */
if (steps.includes('--family-sharing')) {
  console.log('# --family-sharing');
  const cur = (await get(`/v2/inAppPurchases/${IAP}`)).data.attributes.familySharable;
  if (cur) console.log('  = familySharable is already true: nothing to do');
  else {
    await write('PATCH', `/v2/inAppPurchases/${IAP}`, { data: { type: 'inAppPurchases', id: IAP, attributes: { familySharable: true } } });
    if (YES) check((await get(`/v2/inAppPurchases/${IAP}`)).data.attributes.familySharable === true, 'familySharable = true');
  }
  console.log('');
}

/* ------------------------------------------------------------ offer codes */
if (steps.includes('--offer-codes')) {
  console.log('# --offer-codes');
  const CODE = process.env.CODE ?? 'COLORCATCH26';
  const LIMIT = +(process.env.LIMIT ?? 500);
  const DAYS = +(process.env.DAYS ?? 30);
  const NAME = 'Free unlock, 1.2.1 launch';
  const expires = new Date(Date.now() + DAYS * 864e5).toISOString().slice(0, 10);
  if (!/^[A-Z0-9]{6,64}$/.test(CODE)) throw new Error('CODE: 6-64 capital letters and digits');
  const existing = (await get(`/v2/inAppPurchases/${IAP}/offerCodes?limit=50`)).data;
  let offer = existing.find((o) => o.attributes.name === NAME);
  if (offer) console.log(`  = offer "${NAME}" exists (${offer.id}, active ${offer.attributes.active})`);
  else {
    // the free price point of every territory: the equalizations of the USA $0.00 point
    const usaFree = (await all(`/v2/inAppPurchases/${IAP}/pricePoints?filter[territory]=USA&limit=200`)).data.find((x) => +x.attributes.customerPrice === 0);
    const eq = await all(`/v1/inAppPurchasePricePoints/${usaFree.id}/equalizations?limit=200&include=territory`);
    const free = [usaFree, ...eq.data].filter((x) => +x.attributes.customerPrice === 0);
    const territory = (x) => JSON.parse(Buffer.from(x.id, 'base64url').toString()).t;
    console.log(`  free price points found for ${free.length} territories`);
    if (free.length < 175) console.warn(`! only ${free.length} free points; the offer will be limited to those territories`);
    offer = (await write('POST', '/v1/inAppPurchaseOfferCodes', {
      data: {
        type: 'inAppPurchaseOfferCodes',
        attributes: { name: NAME, customerEligibilities: ['NON_SPENDER', 'ACTIVE_SPENDER', 'CHURNED_SPENDER'] },
        relationships: {
          inAppPurchase: { data: { type: 'inAppPurchases', id: IAP } },
          prices: { data: free.map((x) => ({ type: 'inAppPurchaseOfferPrices', id: `\${${territory(x)}}` })) },
        },
      },
      included: free.map((x) => ({
        type: 'inAppPurchaseOfferPrices',
        id: `\${${territory(x)}}`,
        relationships: {
          territory: { data: { type: 'territories', id: territory(x) } },
          pricePoint: { data: { type: 'inAppPurchasePricePoints', id: x.id } },
        },
      })),
    }, 'inAppPurchaseOfferCode')).data;
    if (YES) {
      const back = (await get(`/v2/inAppPurchases/${IAP}/offerCodes?limit=50`)).data.find((o) => o.attributes.name === NAME);
      const prices = back ? (await all(`/v1/inAppPurchaseOfferCodes/${back.id}/prices?limit=200`)).data.length : 0;
      check(back && prices === free.length, `offer "${NAME}" with ${prices} free territory prices`);
    }
  }
  const codes = offer.id.startsWith('<') ? [] : (await get(`/v1/inAppPurchaseOfferCodes/${offer.id}/customCodes?limit=50`)).data;
  if (codes.some((c) => c.attributes.customCode === CODE)) console.log(`  = custom code ${CODE} exists`);
  else {
    await write('POST', '/v1/inAppPurchaseOfferCodeCustomCodes', {
      data: {
        type: 'inAppPurchaseOfferCodeCustomCodes',
        attributes: { customCode: CODE, numberOfCodes: LIMIT, expirationDate: expires },
        relationships: { offerCode: { data: { type: 'inAppPurchaseOfferCodes', id: offer.id } } },
      },
    }, 'customCode');
    if (YES) {
      const c = (await get(`/v1/inAppPurchaseOfferCodes/${offer.id}/customCodes?limit=50`)).data.find((x) => x.attributes.customCode === CODE);
      check(c && c.attributes.numberOfCodes === LIMIT, `custom code ${CODE}, ${LIMIT} redemptions, expires ${expires}, active ${c?.attributes.active}`);
    }
  }
  console.log(`  redeem link: https://apps.apple.com/redeem?ctx=offercodes&id=${APP}&code=${CODE}`);
  console.log('  stop early: PATCH /v1/inAppPurchaseOfferCodeCustomCodes/{id} {"active":false}\n');
}
console.log(`${writes} write(s) ${YES ? 'sent' : 'planned'}.`);
