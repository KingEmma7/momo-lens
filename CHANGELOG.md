# Changelog

## Unreleased

- Complete the typed English catalogue with scoped draft Twi labels and English fallback.
- Reuse warmed local parser assets after cancellation, including password-protected PDFs.
- Use singular wording for one imported transaction, read or skipped row, and duplicate.
- Generate third-party copyright and licence notices with each browser build.

- Preserve malformed PDF transaction rows in the skipped-row report.
- Use provider references for stable transaction identity and migrate saved rows without losing user categories.
- Keep counterparty rules and totals separate when different numbers share the same masked display.
- Prevent stale tabs from restoring deleted transactions and clear open sessions after deletion.
- Add cancellation for statement parsing.
- Let service worker updates wait until old tabs close, preserving active imports and edits.
- Improve mobile control sizes, CSV column-mapping layout and chart accessibility.
- Pin CI actions to verified commits and update vulnerable transitive verification dependencies.
- Patch the Lighthouse archive extractor against tested traversal and symlink writes, with 20 regression cases enforced in CI and registry advisories left visible.

## 1.0.0

Initial source version with local statement parsing, categorization, offline use and private share-card export.
