/**
 * Starts the room server from environment settings (server/README.md):
 *
 *   PORT            port to listen on (default 8787)
 *   HOST            address to listen on (default 0.0.0.0; 127.0.0.1 behind Caddy)
 *   PUBLIC_ORIGINS  comma-separated web addresses allowed to connect,
 *                   e.g. https://colorcatch.pages.dev (empty: any)
 *   HOST_LIMITS     "on" to hold free hosts to the free limits (default off)
 *   MAX_ROOMS       rooms open at once (default 2000)
 *   STATS_TOKEN     turns on GET /stats with "Authorization: Bearer <token>"
 *   TRUST_PROXY     "1" behind Caddy / a load balancer (X-Forwarded-For)
 */

import { startServer } from './node';

const env = process.env;

startServer({
  port: Number(env.PORT ?? 8787),
  host: env.HOST || '0.0.0.0',
  origins: (env.PUBLIC_ORIGINS ?? '').split(',').map((s) => s.trim()),
  statsToken: env.STATS_TOKEN ?? '',
  trustProxy: env.TRUST_PROXY === '1',
  config: {
    hostLimits: env.HOST_LIMITS === 'on',
    ...(env.MAX_ROOMS ? { maxRooms: Number(env.MAX_ROOMS) } : {}),
  },
}).then(({ close }) => {
  let stopping = false;
  const stop = (signal: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`rooms: ${signal}, telling every room and stopping`);
    void close().then(() => process.exit(0));
    // never hang a deploy
    setTimeout(() => process.exit(0), 5_000).unref();
  };
  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));
});
