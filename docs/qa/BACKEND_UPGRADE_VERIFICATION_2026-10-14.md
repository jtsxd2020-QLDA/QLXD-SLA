# Backend upgrade verification — 14/10/2026

## API contract

- `POST /api/permits`, `/api/reports`, `/api/public/reports`: existing input schema, optional `x-idempotency-key` (16–100 URL-safe ASCII characters; UI sends UUID). The same scope/key and validated request digest replay the original identity; changed content returns 409. Header remains optional for compatibility with existing clients. Public response remains receipt code/date only.
- `POST /api/report-status`: `{id, version, status, result, reason}`. Requires admin session and CSRF. Current version must match. Completing requires result (10 characters); reopening requires reason (5 characters). No-op status change is rejected. Return full encrypted-backed admin record with preserved history. Actor is explicitly the shared account, not a personal staff identity.
- `POST /api/inspections`: `InspectionInput` in `lib/types.ts`, admin session + CSRF; `GET` returns admin inspection list. Independent site without GPXD is allowed. Linked record must exist in the selected commune. Permit-comparison conclusions require a permit link; unverified inspection cannot record a verified conclusion; verified conclusion requires documented basis. Endpoint never automatically updates citizen report status.
- `GET /api/analytics`: admin session, filters validated by `validateAnalyticsFilters`. Supports `pending` current status (= received or processing). Response is an encrypted-persisted 30-minute snapshot. Current-state and completion-event metrics are distinctly labelled. All output rows exclude names, contacts, and private contents.
- Export route must require admin session before calling `getAnalyticsSnapshot(id)`. Snapshot is not a public download capability and expired snapshots are unavailable.

## Storage guarantees

Both adapters write encrypted payload, safe analytical metadata, optimistic version, and idempotency identity in one transaction. SQLite uses BEGIN IMMEDIATE; Supabase uses private security-invoker RPC and transaction-level advisory lock for request keys. Snapshot capture reads all source tables in one SQLite transaction or one PostgreSQL SELECT statement snapshot. View/export use the saved snapshot rather than repeat source reads.

New submissions have `source: real`. Old envelopes remain readable and map to `unknown` until a verified manifest is applied. No note/name inference creates demo labels or inspection conclusions. Internal `updateRecordSource(kind,id,source,expectedVersion)` atomically updates encrypted source/version and metadata for root's verified migration; never expose as public endpoint. Legacy data can be explicitly marked `unknown` with that helper to initialize metadata.

The capture rejects more than 10,000 total source records (all groups combined) with an explicit error. It never silently truncates. Larger deployments require a paginated/materialized analytics implementation; current bounded MVP aggregates on the server, not in the citizen browser.

## Executed evidence

- Typecheck passed after integration.
- Backend-only ESLint passed.
- 5 isolated Node backend tests passed: same-key replay/conflict; optimistic status/history/metadata; independent inspection/link rejection; encrypted immutable snapshot/expiry; four separate SQLite processes creating one idempotent record.
- Entire unit suite passed 38 tests at this checkpoint, including independent QA analytics and Excel checks (root may add more checks afterward).
- Created an isolated local PostgreSQL cluster in `/tmp/ttxd-upgrade-pg`, Unix socket only, port 55438. Applied existing migration then `20261014003030_analytics_workflow.sql` successfully.
- `tests/sql/workflow.sql` passed: service-role replay; conflicting digest rejected; stale update rejected without overwriting; metadata version matched payload transition; snapshot count; no anonymous/authenticated table or RPC privileges; RLS enabled on all new tables.
- Four concurrent PostgreSQL RPC clients with one request key produced exactly one report and one idempotency row.
- QA SQL rows cleaned; temporary PostgreSQL server stopped. No live database writes, production changes, or deployments were made by the backend agent.

Supabase changelog and RPC docs were reviewed. New-table API exposure changes are handled by explicit service-role grants and explicit revocation from anonymous/authenticated roles. PostgreSQL legacy pgcrypto cipher changes do not apply to this app's Node AES-GCM encrypted payloads.

## Production PDF packaging regression

The production PDF endpoint failed while Excel succeeded. PDFKit 0.20.2 lazily loads standard font modules with `createRequire(import.meta.url)`. The previous webpack bundle embedded an absolute PDFKit path belonging to the build machine, and the route trace omitted PDFKit's runtime modules. Local export succeeded because the original package still existed, so ordinary local PDF tests did not expose relocation failure.

Fix: keep PDFKit external in `next.config.mjs`, and explicitly trace PDFKit `js`/`lib`/package metadata plus the Vietnamese font/licence for `/api/analytics/export`. Exclude ignored private `data/**` scripts from production TypeScript source discovery; application source, scripts and tests remain included.

Build passed. The actual compiled route and exactly its traced dependencies were copied to a fresh deployment directory, then invoked with an isolated encrypted SQLite snapshot and admin session. Both Excel and PDF returned HTTP 200; PDF header was `%PDF-`. No live account, data, credentials or production request was used. This check is reusable via `node --import tsx scripts/verify-export-bundle.ts` after a build. Root must additionally verify the newly deployed production endpoint.

## PDF Unicode text extraction regression and final font

A richer fixture found an additional issue beyond the initial packaging fix: the prior Noto variable font's shaping/subset mappings could reuse base glyph IDs for different Vietnamese characters. The rendered PDF looked correct, but both Poppler and PDF.js could extract `trong` as `trọng`, `office` as `ọffice`, or omit a Vietnamese mark. Pypdf additionally rejected empty destination mappings in PDFKit's range table. Disabling Latin ligatures alone did not fix the underlying Vietnamese mapping issue and was reverted.

Final fix: use the unmodified static Liberation Sans 2.1.5 regular font, from the official upstream release, under OFL 1.1. Font, licence and source/archive checksum are recorded in `assets/fonts/LiberationSans-SOURCE.md`; runtime tracing includes the new font and licence. Removed the unused Noto font/licence. All default shaping features remain enabled; no PDFKit internals, ToUnicode rewriting, or combining-feature patches are used.

Executed final checks:

- Official release archive SHA256 matched the Homebrew font-liberation cask hash.
- Strict pypdf extraction with warnings treated as errors, Poppler and PDF.js each preserved exact Vietnamese title, UUID, permit IDs containing `office`/`affinity`, Vietnamese locality names and Latin ligature candidates in the isolated fixture.
- Updated `scripts/verify-export-bundle.ts` includes a nonempty permit fixture with Vietnamese names and `office`/`ff`/`fi`. After build, the relocated compiled route returned Excel 200 and PDF 200 (19,197 bytes), and automated Poppler assertions verified every fixture row and exact Unicode text. This local QA script requires `pdftotext` (Poppler) in PATH.
- Final production build, complete ESLint and typecheck passed. Full unit suite: 43 passed.
- Independent QA additionally generated 18 rows/four pages with a complete Vietnamese tone inventory and verified exact text via Poppler/PDF.js, then inspected first/last-page renders.

These are local/relocated-runtime checks. Root is responsible for verifying the final new production deployment and its exported documents before declaring release complete.
