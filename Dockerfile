# Reference deployment image (M0.6). Example, not a supported production
# packaging — see docs/architecture/deployment.md. Builds the client and serves
# it plus the API from one Fastify process (ADR-0022).
#
# `glibc` (Debian) is used rather than Alpine so better-sqlite3 works; and the
# build toolchain is installed because there is no linux-arm64 prebuilt binary
# (on Apple Silicon) so node-gyp compiles it during `npm ci`.
FROM node:20-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# typecheck + vite build → dist/ (the client bundle Fastify serves).
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3001

# Apply migrations, then start Fastify (which serves dist/ and the API).
CMD ["sh", "-c", "npm run db:migrate && npm run start"]