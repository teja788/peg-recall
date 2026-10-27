# Color Catch room server. Build from the REPOSITORY ROOT (the server shares
# the app's engine code in src/):
#
#   docker build -f server/Dockerfile -t color-catch-rooms .
#   docker run -p 8787:8787 -e PUBLIC_ORIGINS=https://colorcatch.pages.dev color-catch-rooms
#
# Works as is on Fly.io, Railway, Render (paid, always-on) or any Docker host.
# Run ONE instance: rooms live in memory.

FROM node:22-alpine AS build
WORKDIR /repo
COPY server/package.json server/package-lock.json server/
RUN npm --prefix server ci --no-audit --no-fund
COPY src src
COPY server/tsconfig.json server/
COPY server/src server/src
RUN npm --prefix server run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /repo/server/dist/server.mjs ./server.mjs
ENV NODE_ENV=production PORT=8787
EXPOSE 8787
USER node
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8787/health || exit 1
CMD ["node", "server.mjs"]
