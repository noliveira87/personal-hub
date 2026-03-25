# Changelog

All notable changes to this project should be documented in this file.

This project follows a lightweight Keep a Changelog style and uses semantic version tags for releases.

## [Unreleased]

### Added
- Versioning structure with `CHANGELOG.md` and release workflow guidance.

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
4. Create a tag like `hub-v0.2.1`
5. Publish a GitHub Release using the matching changelog notes
