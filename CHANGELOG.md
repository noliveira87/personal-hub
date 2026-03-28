# Changelog

All notable changes to this project should be documented in this file.

This project follows a lightweight Keep a Changelog style and uses semantic version tags for releases.

## [Unreleased]

### Added
- Versioning structure with `CHANGELOG.md` and release workflow guidance.

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
