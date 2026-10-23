# Contributing to MoMo Lens

Small, reproducible changes are welcome. Follow the local setup in README, keep statement processing client-side, and include a test for a parser or money change.

## Privacy comes first

Do not submit real statements, account identifiers, phone numbers, balances, names, provider passwords, PINs, or OTPs. Do not paste them into an issue, pull request, screenshot, test failure, or chat. Fixture data must be invented. If you already exposed private information, remove it and contact the repository maintainers privately; removing a visible file does not erase Git history.

## Add or repair a parser

1. Read [docs/PARSERS.md](docs/PARSERS.md). Establish which provider, export date, format, columns, and date conventions are involved.
2. Create the smallest synthetic fixture that reproduces the failing layout. Preserve spacing, wrapping, column positions, page breaks, repeated headers, currency notation, and date syntax. Replace every real value with an invented value.
3. Implement the `StatementParser` interface and register the parser. Detection must return low confidence for ambiguous text. Unknown CSVs should reach the column mapper rather than a guessed provider.
4. Add `// ASSUMPTION:` beside every unverified layout choice and document it in PARSERS.md. Cite the public layout evidence without copying private transaction content.
5. Add exact expected normalized JSON, plus cases for wrapped rows, repeated page headings, credit and debit notation, reversals, standalone charges, duplicates, malformed rows, and ambiguous fields.
6. Run lint, typecheck, unit tests with coverage, a production build, and relevant E2E tests. Explain remaining uncertainty in the pull request.

A redacted sample is useful only if it is safe to share. Prefer a hand-recreated synthetic document. For a PDF, placing a black rectangle over text may leave the underlying text extractable. Remove hidden text, metadata, attachments, links, and every personal value, then inspect extraction and render output. Never send a document you are unsure about. A column list and synthetic example are usually enough to report a bug.

## Development conventions

- Use integer pesewas for all calculation. Format only at the display boundary.
- Do not add network requests to data-processing code or lazy assets loaded from a CDN.
- Use the local worker for parsing. Preserve cancellation and progress feedback.
- Keep accessible labels, keyboard focus, touch targets, chart tables, and reduced motion support.
- Keep strings in the typed i18n structure when possible. Twi additions require native-speaker review.
- Use error codes and plain explanations. Do not log statement text or transaction objects.
- Add dependencies only when their benefit justifies download and maintenance costs.

## Pull requests

Describe the user-visible behavior, the synthetic input that reproduces the problem, the fix, and checks actually run. State any tests you could not run. A screenshot helps for a visual change, but must use synthetic sample data. The PR template provides a short checklist.

## Code of conduct and security

Follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Report security problems using [SECURITY.md](SECURITY.md), rather than a public issue containing sensitive details.
