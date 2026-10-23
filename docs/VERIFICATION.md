# Verification record

MoMo Lens was checked on 23 October 2026 using synthetic data only. No real customer statement was included in source, logs, screenshots or test reports.

## Measured results

| Check                                                        | Result                                                                                                                                                                 |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frozen dependency installation in a separate local Git clone | Passed, 627 packages installed from the existing package cache                                                                                                         |
| Strict lint                                                  | Passed, zero errors or warnings                                                                                                                                        |
| Route type generation and strict TypeScript                  | Passed                                                                                                                                                                 |
| Unit tests                                                   | 93 passed                                                                                                                                                              |
| Parser and categorizer statements                            | 100%, 239/239                                                                                                                                                          |
| Parser and categorizer lines                                 | 100%, 205/205                                                                                                                                                          |
| Parser and categorizer functions                             | 100%, 44/44                                                                                                                                                            |
| Parser and categorizer branches                              | 94.36%, 201/213                                                                                                                                                        |
| Production static export                                     | Passed in the main checkout and final separate local clone, including strict CSP generation and offline precache                                                       |
| Browser tests, desktop and 360 px                            | 38/38 passed in the final local clone, 39.9 seconds                                                                                                                    |
| Actual monthly chart                                         | Rendered SVG verified in both viewports before chart/table and Wrapped checks                                                                                          |
| axe                                                          | Zero serious or critical findings across all seven screens, desktop and 360 px                                                                                         |
| Keyboard-only navigation                                     | All seven screens passed in desktop and 360 px browser projects                                                                                                        |
| Requests during and after import                             | Zero for CSV, multipage text PDF, and password-protected PDF retry, with service workers blocked                                                                       |
| Offline                                                      | Service worker control, offline reload, and local Telecel fixture import passed in both projects                                                                       |
| Large input                                                  | 10,001 transactions parsed in the worker; fewer than 100 transaction rows mounted in the virtualized review                                                            |
| Unfamiliar CSV                                               | Explicit column mapping imports the three-row unknown-layout fixture                                                                                                   |
| Persistence and deletion                                     | Remembering, reload, retroactive counterparty rules and deletion passed                                                                                                |
| Sample isolation and mixed providers                         | Remembered 24-row MTN import survives a 72-row demo and demo rule edits; importing 8 Telecel rows while exploring the demo yields 32 real rows and no saved demo rules |
| Wrapped                                                      | Actual 1080 × 1350 PNG exported, with names and exact amounts hidden by default; unsupported Web Share download and a supported-share API mock passed                  |
| Visual QA                                                    | All seven screens captured at 1440 px desktop and 360 px mobile widths, plus actual PNG export; no document-level horizontal overflow                                  |
| Development command in clean clone                           | Home, worker startup and local 24-row MTN import passed at 360 px, with no page or console errors                                                                      |

Unit coverage targets are enforced by Vitest. The coverage scope is `lib/parsers` and `lib/categorise`; these percentages do not describe the entire application. Worker, storage and client startup behavior have additional tests outside that coverage denominator.

The final local clone was created from sanitized temporary Git source snapshot `43547b672f8e2c11f4682fb0c4316de17b1b4f1e`. This is a local verification commit, not a published repository revision. Generated outputs and dependencies were excluded. With Node 24.13.0 and pnpm 11.17.0, a fresh clone installed all 627 packages from the existing package cache using `--offline --frozen-lockfile`, then independently ran lint, route type generation, TypeScript, coverage, build and all browser tests. The production tests used a separate port, 3101. The development smoke check used an earlier local clone updated with the identical navigation-key correction, on port 3201. Final documentation and report files were updated after these checks. See the [local-clone result summary](reports/clean-clone-summary.json).

## Lighthouse mobile

Three cold-load home-page runs used a 360 × 800 viewport, simulated mobile network throttling and 4× CPU slowdown. No audit was disabled and no acceptance threshold was reduced.

| Run    | Performance | Accessibility | Best Practices |
| ------ | ----------- | ------------- | -------------- |
| 1      | 92          | 100           | 100            |
| 2      | 98          | 100           | 100            |
| 3      | 99          | 100           | 100            |
| Median | 98          | 100           | 100            |

Every run meets the requested targets of 90, 100 and 95. Median FCP was 1.08 s, LCP 2.29 s, total blocking time 62 ms, and cumulative layout shift 0.00019. The first audited load transferred 148,964 bytes for seven script resources, including response headers, below the 200 KB home JavaScript budget. Total page transfer was 202,236 bytes.

These are local emulated mobile measurements of the home route, not measurements from physical Android hardware or every populated route. The other routes were checked through browser interaction, keyboard navigation and axe.

Evidence: [machine-readable run summary](reports/lighthouse-mobile-summary.json), [median HTML report](reports/lighthouse-mobile-median.html), and raw [run 1](reports/lighthouse-mobile-run-1.json), [run 2](reports/lighthouse-mobile-run-2.json), [run 3](reports/lighthouse-mobile-run-3.json).

## Visual direction

The final interface uses a ledger layout: three plain summary figures, then a sortable four-column transaction ledger. Monthly and category charts follow the ledger. Amounts align to the right with tabular numerals. Horizontal tables remain inside keyboard-focusable scroll regions; the transaction ledger gives a sideways-scroll instruction on narrow screens.

The top signature is “Your file never leaves your browser.” Fonts are locally bundled Inter Tight, weights 400 and 600. White, near-black and neutral grey form the interface palette; the gold accent appears only in chart marks. There are no gradients, decorative illustrations, sparkles, eyebrow labels, numbered steps, status pills, rounded card layouts or arrow calls to action. Sample figures come from a clearly labelled synthetic file.

All 14 screen captures and the actual Wrapped export were visually inspected. Computed-style checks found only the intended font family and weights, no gradients or banned motifs, no arrow calls to action, and no page-level overflow. Pixel checks show that every non-chart screenshot and the actual export is fully grayscale. The dashboard is the only screen containing gold chart pixels. Default black properties on unpainted SVG definitions do not appear as black pixels in the rendered output.

See the [screenshot matrix in README](../README.md#verification), [computed-style audit](screenshots/audit.json), [pixel audit](screenshots/paint-audit.json), and [actual privacy-default Wrapped export](screenshots/wrapped-export.png).

## Parser assumptions

All assumptions, their source evidence and matching code comments are listed in [PARSERS.md](PARSERS.md). The complete current set is:

1. MTN's column layout is provisional. Signed Amount is principal; separate Fees and Tax are additional charges. CSV exports with these labels are synthetic equivalents, not confirmed provider features.
2. Telecel's indexed provider-hosted CDR layout is one useful variant. Paid In is credit and Withdrawn is principal debit, including negative values. A matching CSV is a synthetic equivalent.
3. Charges come only from explicit columns or clearly labelled standalone charge rows. Ambiguous payments are not guessed to be fees. No tariff or current E-Levy rate is inferred.
4. PDF extraction follows text-item order, starts a new line after a vertical gap above 3 points, and separates columns after a horizontal gap above 12 points. Repeated headers and description continuations are supported within this geometry. There is no OCR.
5. Numeric dates use day/month/year; text dates use English three-letter months. Missing times mean midnight in Africa/Accra. Supported years are 1900 to 2200.
6. CSVs have headers, with recognized preambles allowed. The unknown-layout mapper starts at the first row. Signed Amount uses positive for in and negative or brackets for out. Debit/Credit labels determine direction. Both nonzero in one row and more than two decimals are rejected.
7. Explicit counterparty names are preferred. Recognized Ghana phone patterns in names and descriptions are masked. Unknown counterparties remain unknown.
8. A deterministic 64-bit identity includes provider, UTC date/time, signed amount, reference, description and counterparty. Identical rows deduplicate. Truly distinct identical rows without references cannot be distinguished.
9. Reversals remain separate credits or debits. Gross outflow retains the original payment; net reflects money returned. No original/reversal pairing is guessed.
10. Brand text in a file name or preamble plus valid structural columns determines provider confidence. This is a heuristic, not provider authentication. Uncertain layouts reach the mapper.

## Privacy and verification limits

The production build generates exact SHA-256 allowances for the static inline bootstrap scripts and places the restrictive CSP first in each exported page. Connections are limited to the same origin. The browser test confirms a cross-origin fetch is blocked. Provider files and passwords stay out of requests and URLs. Next may add its original broader meta policy during hydration; the first restrictive policy remains in effect, and browsers enforce all policies together.

The offline test controls and reloads the service worker, then imports a selected file while the browser is offline. It does not automate an operating system's PWA installation dialog. Mobile Web Share is checked using a mock API receiving a real local PNG, so a physical Android share sheet still needs a release check.

Representative safely redacted MTN and Telecel exports are still needed to harden the provisional parsers. XLSX is omitted because a provider export could not be confirmed. Twi labels require native-speaker review. Production hosting headers, native installation, device storage behavior and service worker updates should also be checked on the chosen deployed origin and representative Android hardware.

Before a public community release, maintainers must supply a public repository URL, enable private vulnerability reporting, publish a conduct contact and replace the demo URL placeholder. A walkthrough GIF remains a documentation placeholder. Those release tasks are listed in README and do not change local statement processing.
