/**
 * App counts, device side: copy this file into an app as is (no dependencies).
 * The rules and the server are in the ship-ios-app skill, app-counts/README.md.
 *
 * Counts are kept per local day on the device and posted with no ID. A day's
 * first post also says the version, platform, language and days since install,
 * which is how the server counts active devices and retention. A post that
 * fails is kept and sent with the next one; days over a week old are dropped.
 *
 *   const counts = createCounts({ app: 'my-app', url: 'https://…/c', storage, version, platform, lang });
 *   counts.add({ 'game.classic': 1 });   // after each finished game, say
 *   counts.foreground(true / false);     // from AppState: time in the app, and a post
 */

export interface CountsStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}

export interface CountsOptions {
  app: string;
  /** the Worker's POST address, e.g. https://app-counts.<you>.workers.dev/c; '' turns counting off */
  url: string;
  storage: CountsStorage;
  version: string;
  /** e.g. "ios-phone", "ios-pad", "web" */
  platform: string;
  lang: string;
  /** when the app was installed (ms), or null if unknown; asked once */
  installedAt?: () => Promise<number | null>;
  now?: () => number;
  fetch?: typeof fetch;
}

export interface Counts {
  add: (n: Record<string, number>) => void;
  flush: () => Promise<void>;
  foreground: (active: boolean) => void;
}

interface DayEntry {
  n: Record<string, number>;
  /** 1 once this day's first post (the "active" one) went through */
  a: 0 | 1;
}

interface Saved {
  /** install day, or null if unknown */
  install: string | null;
  days: Record<string, DayEntry>;
}

export const COUNTS_KEY = 'app-counts.v1';
const KEY = /^[a-z0-9_.:-]{1,40}$/;
const KEEP_DAYS = 7;
const MAX_KEYS = 40;
/** one stretch in the foreground counts for at most this long (a forgotten open app) */
const MAX_STRETCH_S = 3 * 3600;

/** "YYYY-MM-DD" in the device's own time zone */
export function localDay(ms: number): string {
  const d = new Date(ms);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const dayNumber = (day: string) => Math.round(Date.parse(`${day}T00:00:00Z`) / 864e5);

export function createCounts(o: CountsOptions): Counts {
  const now = o.now ?? Date.now;
  const post = o.fetch ?? fetch;
  let saved: Saved = { install: null, days: {} };
  let sending: Promise<void> | null = null;
  let since: number | null = null;

  const ready: Promise<void> = (async () => {
    try {
      const raw = await o.storage.getItem(COUNTS_KEY);
      const old = raw ? (JSON.parse(raw) as Saved) : null;
      if (old && typeof old.days === 'object' && old.days) return void (saved = old);
      const at = (await o.installedAt?.().catch(() => null)) ?? null;
      saved = { install: at == null ? null : localDay(at), days: {} };
    } catch {
      /* unreadable: start again */
    }
  })();

  const save = () => o.storage.setItem(COUNTS_KEY, JSON.stringify(saved)).catch(() => {});

  function today(): DayEntry {
    const day = localDay(now());
    const oldest = localDay(now() - KEEP_DAYS * 864e5);
    for (const d of Object.keys(saved.days)) if (d < oldest) delete saved.days[d];
    return (saved.days[day] ??= { n: {}, a: 0 });
  }

  function add(n: Record<string, number>): void {
    if (!o.url) return;
    void ready.then(() => {
      const e = today();
      for (const [k, v] of Object.entries(n)) {
        const by = Math.round(v);
        if (!KEY.test(k) || !(by > 0)) continue;
        if (!(k in e.n) && Object.keys(e.n).length >= MAX_KEYS) continue;
        e.n[k] = (e.n[k] ?? 0) + by;
      }
      return save();
    });
  }

  function flush(): Promise<void> {
    if (!o.url) return Promise.resolve();
    sending ??= (async () => {
      await ready;
      today(); // opening the app makes the device active today
      const sent = Object.entries(saved.days)
        .filter(([, e]) => !e.a || Object.keys(e.n).length > 0)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([day, e]) => ({
          day,
          n: { ...e.n },
          ...(e.a
            ? {}
            : {
                first: {
                  v: o.version,
                  platform: o.platform,
                  lang: o.lang,
                  age: saved.install ? Math.max(0, dayNumber(day) - dayNumber(saved.install)) : -1,
                },
              }),
        }));
      if (sent.length === 0) return;
      const res = await post(o.url, {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: JSON.stringify({ app: o.app, days: sent }),
      });
      // 400: the server will never take these (too old, say), so let them go
      if (!res.ok && res.status !== 400) return;
      for (const s of sent) {
        const e = saved.days[s.day];
        if (!e) continue;
        e.a = 1;
        for (const [k, v] of Object.entries(s.n)) {
          e.n[k] = (e.n[k] ?? 0) - v;
          if (e.n[k] <= 0) delete e.n[k];
        }
      }
      await save();
    })()
      .catch(() => {
        /* offline: the counts wait for the next post */
      })
      .finally(() => {
        sending = null;
      });
    return sending;
  }

  function foreground(active: boolean): void {
    if (active) {
      since ??= now();
    } else if (since != null) {
      const s = Math.min((now() - since) / 1000, MAX_STRETCH_S);
      since = null;
      if (s >= 1) add({ secs: s });
    }
    void ready.then(flush);
  }

  return { add, flush, foreground };
}
