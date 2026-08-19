# ADR-0026: Asset Upload Pipeline

## Status

Accepted

## Date

2026-08-18

## Context

[REQ-IMP-004](../product/requirements/REQ-IMP.md#req-imp-004--asset-upload-through-the-api)
and [REQ-AUTH-002](../product/requirements/REQ-AUTH.md#req-auth-002--image-upload-10-mb-cap-resize-to-2000-px)
require image upload with a 10 MB cap and automatic resize to a maximum
2000 px side, through the API (consumed by the import script, [M1.12](../product/milestones.md#m112--access-administration-and-api-surface-completion))
and later through the authoring UI ([M1.16](../product/milestones.md#m116--authoring-ui)).
The object-storage port (`ObjectStorage`, REQ-FDN-006) and its S3-compatible
adapter already exist and are tested against real MinIO in CI.
`UPLOAD_MAX_BYTES` (default 10 485 760) and `IMAGE_MAX_DIMENSION` (default 2000) are already validated instance configuration with no consumer.
`STORAGE_PUBLIC_BASE_URL` is also already configured ("Public URL prefix for
stored assets, if different from the endpoint") — the configuration surface
already assumes assets resolve to a directly loadable URL, not a proxied,
authenticated route. Nothing in the codebase parses `multipart/form-data` or
touches an image library; no `Asset` entity, table or repository exists.

Two library choices are needed (multipart parsing, image resize) and one
storage/serving convention (key scheme, URL construction, idempotency on
re-upload).

## Decision

### Multipart parsing — `@fastify/multipart`

The official Fastify plugin. Already on Fastify (ADR-0022); adding it is
the same pattern as `@fastify/cookie`, already in use. MIT-licensed,
maintained by the Fastify org, and it supports a `limits.fileSize` option
that rejects an oversized upload while streaming rather than after
buffering the whole body — the correct enforcement point for
`UPLOAD_MAX_BYTES`.

### Image resize — `sharp`

By a wide margin the standard choice for the Node ecosystem (libvips-based,
fastest widely-used option, largest install base). Apache-2.0 licensed —
not MIT, but the same MIT-compatible standard the project already accepted
for `@aws-sdk/client-s3` (also Apache-2.0, already a runtime dependency for
the S3 adapter this feature builds on). Alternatives considered below.

Resize rule: only when the decoded image's width or height exceeds
`IMAGE_MAX_DIMENSION`, `sharp(...).resize({ width: MAX, height: MAX, fit:
'inside', withoutEnlargement: true })` — preserves aspect ratio, never
upscales a smaller image, and format (JPEG/PNG/WebP/GIF) is preserved
rather than normalised to one output type, since re-encoding a PNG to JPEG
loses transparency and re-encoding a JPEG to PNG inflates size for no
benefit.

**Scope is images only in R1.** Both consuming requirements name "image
upload" specifically; a non-image content type is rejected with a
validation error rather than stored as an opaque blob. General file
attachment (PDFs, videos) is not an R1 requirement and is not built here.

### Storage key and URL

Key: `assets/{companyId}/{projectId}/{assetId}.{ext}`, where `assetId` is a
generated UUIDv4 (ADR-0004) and `ext` is derived from the detected image
format after any resize. Company- and project-scoping in the key path
mirrors the tenancy boundary every other entity carries (ADR-0002,
ADR-0010) and keeps a company's assets groupable for operational purposes
(backup, bulk migration) without needing the database.

URL: `${STORAGE_PUBLIC_BASE_URL}/{key}` when `STORAGE_PUBLIC_BASE_URL` is
set, else `${STORAGE_S3_ENDPOINT}/{bucket}/{key}` (path-style) as a
fallback for local/MinIO development. **Assets are served directly from
storage, not proxied through an authenticated Fastify route.** This
follows the configuration surface as it already exists
(`STORAGE_PUBLIC_BASE_URL` presupposes a directly loadable URL) and matches
how the content that embeds these URLs works: a Markdown `![](url)` is
rendered by the reader's browser with no opportunity to attach an
`Authorization` header. This is a narrower guarantee than
[REQ-FDN-008](../product/requirements/REQ-FDN.md#req-fdn-008--search-scoping-enforced-server-side)'s
authorised route for the search index artifact — that trade is accepted
here because an image is not itself the documentation content REQ-SEC-012
protects (a non-publishable free page's _text_ is never in an asset), and
unguessable UUIDv4 keys in an unlisted bucket is the same protection model
most documentation tools use for embedded images. Operators who need
stricter control point `STORAGE_S3_ENDPOINT` at a bucket with its own
access policy; that is an operational concern outside this ADR.

### `Asset` entity and idempotency

A new `assets` table: `id`, `company_id`, `project_id`, `custom_id`
(nullable, unique per project — REQ-IMP-003), `storage_key`,
`content_type`, `size_bytes`, `width`, `height`,
`original_filename`, `created_at`, `updated_at`. A new `AssetRepository`
port and `AssetService`, following the same shape as every other R1
entity rather than special-casing upload as a stateless pass-through — the
reconciliation report ([REQ-IMP-006](../product/requirements/REQ-IMP.md#req-imp-006--reconciliation-report))
needs something to enumerate, and "every image referenced by imported
content resolves after import" ([REQ-IMP-004](../product/requirements/REQ-IMP.md#req-imp-004--asset-upload-through-the-api)
acceptance) needs a record to check content against.

**Idempotency on `custom_id` (REQ-IMP-003) skips re-processing rather than
re-uploading.** Every other entity's upsert-on-`custom_id` pattern
(`PageService.create` et al.) updates the existing row's fields on a
repeat call. An asset's "fields" are the bytes themselves — there is
nothing to partially update — so a repeat call with a `custom_id` that
already exists returns the existing asset's id and URL unchanged and does
not re-read, re-resize or re-`PUT` the file. This is cheaper for a
resumed/re-run import ([REQ-IMP-007](../product/requirements/REQ-IMP.md#req-imp-007--import-scripts-committed-and-re-runnable))
and matches "a re-run does not duplicate assets" literally — nothing about
the requirement asks a re-run to _replace_ what is already there.

### Permission

Upload requires `project.edit` on the target project, the same permission
every other content write in the project requires.

## Alternatives Considered

### Jimp (pure-JS image library) instead of sharp

Rejected. Pure JavaScript decoding is materially slower and historically
lagged in format support (WebP support has been inconsistent across
versions); sharp's libvips backend is the ecosystem default for a reason.
The only argument for Jimp — no native binary — is not a real constraint
here: the S3 adapter already pulls in a native-dependency-adjacent SDK, and
the reference deployment (Docker, REQ-FDN-012) builds the image, so a
prebuilt native binary is not a portability problem the way it would be
for a package meant to run in a browser or a serverless edge runtime.

### Proxy asset bytes through an authenticated `GET /api/assets/:id` route (mirroring the search-index-artifact pattern)

Rejected for R1, for the reason given above: it contradicts
`STORAGE_PUBLIC_BASE_URL`'s existing purpose, and embedded Markdown images
cannot carry an `Authorization` header on a plain `<img>` load. If a future
requirement needs authenticated image access (e.g. assets for a
non-publishable free page under REQ-SEC-012's stricter reading), that is a
new decision to make explicitly then, not a default to assume now.

### Content-addressed storage keys (hash of the file bytes) instead of `assetId`

Rejected. Hash-addressing gives free deduplication of identical bytes, but
it also means two unrelated uploads of the same image collide into one
storage object with two owners, which complicates deletion (`DELETE
/api/assets/:id` cannot simply remove the object if another asset row
might reference the same key) for a benefit — dedup — that no requirement
asks for. `assetId`-addressing keeps "one row, one object, one owner" and
deletion trivial.

### Store assets as base64 in the database instead of object storage

Rejected outright. The object-storage port exists specifically so blobs
never sit in the relational database (REQ-FDN-006); this ADR is about how
to reach the port that decision already established, not whether to.

## Consequences

- Two new runtime dependencies: `@fastify/multipart` (MIT), `sharp`
  (Apache-2.0). Documented per `ENGINEERING_GUIDE.md`'s dependency policy
  in the PR that adds them.
- One new migration (`assets` table), one new port
  (`AssetRepository`), one new SQLite adapter, one new
  `AssetService`, one new route module (`POST /api/projects/:projectId/assets`,
  `GET /api/projects/:projectId/assets`, `DELETE /api/assets/:id` per
  [ADR-0025](0025-r1-entity-deletion-semantics.md) — an asset has no
  incoming references from any other R1 entity, so deletion is
  unconditional).
- `sharp`'s native binary must be present in the Docker build
  ([REQ-FDN-012](../product/requirements/REQ-FDN.md#req-fdn-012--reference-deployment-stack-and-ci)) —
  it ships prebuilt binaries for the standard Linux/musl targets `npm
install` already resolves, so no Dockerfile change beyond the existing
  `npm ci` step is expected, but this is verified when the reference stack
  is rebuilt.
- The reconciliation report (REQ-IMP-006) gains an asset-resolution check
  as a follow-on integration, not built in the same change as the upload
  route itself.
- `STORAGE_PUBLIC_BASE_URL`'s documented purpose is now exercised by real
  code instead of being configured with no consumer.

## Related

- [ADR-0004](0004-immutable-internal-identifiers.md) — `assetId` generation.
- [ADR-0025](0025-r1-entity-deletion-semantics.md) — deletion semantics an
  `Asset` follows (unconditional, no owned rows, no references).
- REQ-FDN-006 (object storage port), REQ-IMP-003 (`custom_id` upsert),
  REQ-IMP-004, REQ-AUTH-002.
