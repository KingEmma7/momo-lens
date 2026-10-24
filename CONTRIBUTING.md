# Contributing to MoMo Lens

Start with a [good first issue](https://github.com/KingEmma7/momo-lens/labels/good%20first%20issue), improve a guide, or report a reproducible problem. Comment on an issue with your intended scope to avoid duplicate work. Keep statement processing client-side and include a regression for a parser or money change.

## Local setup and checks

Use Node 22.23.4 and pnpm 11.17.0 for the tested setup. Run `pnpm install --frozen-lockfile`, then `pnpm dev` and open http://localhost:3000. The [README](README.md#run-locally) explains sample data and production use.

For a prose-only change, check links and run Prettier on the edited files. For code, run the affected tests first, then:

```sh
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:archive-security
pnpm exec playwright install chromium
pnpm build
pnpm test:e2e
pnpm format:check
```

`test:coverage` already runs the unit suite. Browser tests require the production export and start their own server. Normal installation and CI do not require Python. See [VERIFICATION.md](docs/VERIFICATION.md) for measured scope and limits.

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
