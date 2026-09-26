/**
 * Minimal App Store Connect API client (ES256 JWT via node:crypto, no deps).
 *
 *   node scripts/asc-api.mjs status        # versions + review state of Color Catch
 *   node scripts/asc-api.mjs get <path>    # raw GET, e.g. /v1/apps/6813625311/appStoreVersions
 *
 * Credentials live outside the repo: ~/.appstoreconnect/config.json holds
 * {"keyId", "issuerId"} and the key is ~/.appstoreconnect/private_keys/AuthKey_<keyId>.p8.
 * Env ASC_KEY_ID / ASC_ISSUER_ID / ASC_KEY_PATH override them.
 */
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CONF_PATH = path.join(os.homedir(), '.appstoreconnect/config.json');
let conf = {};
try { conf = JSON.parse(readFileSync(CONF_PATH, 'utf8')); } catch {}
const KEY_ID = process.env.ASC_KEY_ID ?? conf.keyId;
const ISSUER_ID = process.env.ASC_ISSUER_ID ?? conf.issuerId;
if (!KEY_ID || !ISSUER_ID) { console.error(`missing keyId/issuerId: set them in ${CONF_PATH}`); process.exit(1); }
const KEY_PATH = process.env.ASC_KEY_PATH ?? path.join(os.homedir(), '.appstoreconnect/private_keys', `AuthKey_${KEY_ID}.p8`);
export const APP_ID = '6813625311';

const b64url = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');

function token() {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })}.${b64url({ iss: ISSUER_ID, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' })}`;
  const sig = createSign('SHA256').update(unsigned).sign({ key: readFileSync(KEY_PATH), dsaEncoding: 'ieee-p1363' });
  return `${unsigned}.${sig.toString('base64url')}`;
}

export async function api(method, p, body) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${p}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${p} -> ${res.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'status') {
  const v = await api('GET', `/v1/apps/${APP_ID}/appStoreVersions?fields[appStoreVersions]=versionString,appStoreState,releaseType,createdDate`);
  for (const x of v.data) console.log(x.attributes.versionString.padEnd(8), x.attributes.appStoreState.padEnd(24), x.attributes.releaseType);
} else if (cmd === 'get') {
  console.log(JSON.stringify(await api('GET', arg), null, 1));
} else if (cmd) {
  console.error(`unknown command ${cmd}`); process.exit(1);
}
