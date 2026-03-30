# Changelog

All notable changes to this project should be documented in this file.

This project follows a lightweight Keep a Changelog style and uses semantic version tags for releases.

## [Unreleased]

## [v1.4.0-stable] - 2026-03-30

### Added
- Feature-first Contracts module under `packages/hub/src/features/contracts` with domain-scoped pages, components, context, lib and types.

### Changed
- Contracts routes were consolidated under `/contracts/*` (`/contracts/calendar`, `/contracts/alerts`, `/contracts/insights`) and sidebar navigation was aligned.
- Contracts data loading provider scope was reduced to contracts and dashboard routes instead of the full app shell.
- Contracts pages were aligned to the shared app header behavior and redundant page-level controls were removed.
- Desktop contracts sidebar was simplified by removing redundant "Projects" back links.

### Refactor
- Legacy contracts files were removed from `pages/contracts`, `components`, `context`, `lib` and `types` after migrating all imports to the new feature paths.
- Cross-module imports were updated to use contracts feature paths in dashboard and hooks consuming contracts types/data.

## [v1.3.0-stable] - 2026-03-30

### Added
- Versioning structure with `CHANGELOG.md` and release workflow guidance.
- PT/EN internationalization layer for the Hub app with a shared provider, translation catalog and language switcher.

### Changed
- Deployment script now skips dependency installation when `package-lock.json` is unchanged and keeps native dependency fallback checks for Linux builds.
- Trips shell, dashboard, settings, not found and work-in-progress pages now follow the selected PT/EN language.
- Trips cards, detail views, dialogs, forms and map labels now localize visible destination and title text based on the selected language.
- Trips title localization now translates place names embedded in freeform titles, not only exact destination matches.
- Trips dashboard destination totals now count non-Portugal locations only, excluding Portuguese stopovers inside international trips.
- Trips world map counters were aligned with the actual pins rendered on the world map while preserving the separate Portugal mini-map behavior.

### Fixed
- Trips destination counting no longer relies on map-derived labels that could drift from the intended overall totals.
- Mixed-language trip labels such as PT titles or pin labels appearing in EN mode.
- Japan trip pins and labels falling back to overly specific district names such as Minato instead of the main destination.
- Missing bidirectional translations for locations such as Germany/Alemanha and Berlin/Berlim in trip titles and pin labels.

## [v1.2.0-stable] - 2026-03-30

### Added
- California and New York trip import scripts with structured travel, hotel and expense payloads.
- Trips location extraction utilities to derive city-level map pins from hotel/address data.

### Changed
- Deployment script now skips dependency installation when `package-lock.json` is unchanged and keeps native dependency fallback checks for Linux builds.
- Trips map experience now includes country highlighting, US state-level highlighting and Portugal mini-map rendering.
- Trips create/edit flow was expanded to support richer trip data, food review URLs, photo handling and improved trip editing UX.
- Trips data loading and persistence were updated to support the expanded structured trip payload.

### Fixed
- Remote deploy handling for optional native dependencies.
- Trips map/pin behavior and trip edit interactions in the dashboard and detail flows.

## [v1.1.0-stable] - 2026-03-29

### Added
- New Tokyo 2026 trip import script with full travel/hotel/expenses payload and photo upload to Supabase Storage.
- One-shot migration script to move existing trip photos from base64 in DB to Supabase Storage public URLs.
- Trips world map component and storage image URL optimization helper.

### Changed
- Trips photo handling migrated from base64 blobs in the `trips` table to Supabase Storage URLs.
- Trips form now uploads photos directly to Storage.
- Trips import scripts now upload images to Storage instead of embedding data URLs.

### Performance
- Trips image rendering now requests transformed Storage URLs (smaller thumbnails and tuned quality).
- Added lazy/deferred image decoding and fetch priority tuning for above-the-fold Trip cards.
- Trips dashboard stats now use memoized calculations to reduce repeated render work.

### Fixed
- React invalid hook call caused by duplicated React resolution in shared UI package / Vite setup.

## [v1.0.6-stable] - 2026-03-28

### Added
- New Trips module integrated into Personal Hub with home launcher card and dedicated route.
- Supabase-backed Trips data layer with CRUD support and full schema/policies in `packages/hub/supabase/trips.sql`.
- Initial CrossFit Games 2023 trip imported into database, including photos and structured travel details.

### Changed
- Trips landing experience now mirrors the original Travel Story homepage flow (dashboard, detail and form views) inside Hub.
- Hub global typography now includes display/body font utilities used by the new Trips UI.

## [v1.0.5-stable] - 2026-03-28

### Performance
- Portfolio startup now hydrates critical investment data first and loads snapshots/earnings in the background to render the page faster.
- Earnings section calculations were reduced to single-pass aggregations to improve responsiveness with larger datasets.
- Crypto quote fetching is now conditional (only when crypto investments exist) with short session caching to reduce repeated startup latency.

### Changed
- Portfolio earnings panel now shows a local loading state while earnings hydration completes, without blocking the rest of the page.

## [v1.0.4-stable] - 2026-03-27

### Changed
- Contracts dashboard now separates active subscriptions into monthly and yearly sections for quicker scanning.
- Hub public branding assets were refreshed to use the latest D12 icon set.

## [v1.0.3-stable] - 2026-03-27

### Added
- Portfolio earnings support for `dividend` across forms, summaries, insights and charts.
- Import scripts for dividends and social media earnings reconciliation.

### Changed
- Rewards & surveys overview now keeps all all-time labels on the top row and the monthly total beside the action button on the second row.
- Earnings overview and monthly insights now include social media totals in cards, summaries and chart series.

### Fixed
- Hidden monthly dividend breakdown row when the selected month has no dividends.
- Performance by type heading hierarchy in portfolio insights.
- Portfolio earnings database constraint to accept the `dividend` kind on existing environments.

## [v0.2.0] - 2026-03-25

### Fixed
- Portfolio movement handling for contributions, withdrawals, profit/return updates and removals.
- Monthly insights to separate invested capital from monthly performance.
- Negative profit/loss display in recent movements and cards.
- Crypto contribution removal to also restore tracked units for new movements storing `units`.

### Changed
- Portfolio dialogs and quick actions now keep investment values more consistent across cash, ETF, P2P and crypto flows.
- Contracts insights chart now loads lazily.
- Vite bundle splitting improved with route-level lazy loading and vendor chunk grouping.

### Performance
- Reduced initial app bundle by lazy-loading pages.
- Split heavy dependencies into smaller cached vendor chunks.

---

## Release workflow

1. Merge validated work into `main`
2. Deploy and confirm production is stable
3. Update `CHANGELOG.md`
4. Create a tag like `v1.0.5-stable`
5. Publish a GitHub Release using the matching changelog notes
