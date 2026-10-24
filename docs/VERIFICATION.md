# Verification and limits

Independent local verification on 23 October 2026 used synthetic statements, a fresh source copy, Node 22.23.4, pnpm 11.17.0 and the frozen lockfile. The table below records local results, separate from hosted CI. Neither establishes deployment, universal provider compatibility or physical-device certification.

| Check                                      | Measured result                                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Install, lint, strict types and formatting | Passed with zero lint warnings                                                                                                             |
| Production export                          | Passed; nine pages, exact inline-script CSP hashes, parser asset manifest and content-fingerprinted offline cache                          |
| Unit tests                                 | 115 tests in eight files passed                                                                                                            |
| Parser/categorizer coverage                | Statements 242/242, lines 210/210 and functions 44/44 (100%); branches 209/220 (95%)                                                       |
| Browser suite                              | 54/54 passed in desktop Chromium and 360x800 Android emulation                                                                             |
| Archive-security patch                     | 20/20 targeted checks passed on macOS and Linux ARM64; registry warnings remain visible                                                    |
| Documented development launch              | `pnpm dev` at localhost:3000 imported the 72-row synthetic sample with no page errors                                                      |
| Interface                                  | 48 final scans at 360, 768 and 1440px with zero axe violations or document overflow; all 293 rendered control occurrences reached with Tab |
| Native browser zoom                        | 200% Chrome zoom passed all seven main screens                                                                                             |
| Lighthouse                                 | Three mobile runs passed the configured thresholds; median Performance 99, Accessibility 100, Best Practices 100, SEO 100                  |
| Initial home scripts                       | 156,170 individually gzip-compressed bytes, below the 200 KB budget                                                                        |

Coverage includes `lib/parsers` and `lib/categorise`, excluding type-only files. It is not whole-application coverage. Identity, storage, analytics, workers and the UI have separate checks outside that denominator. Lighthouse used a compressed local static server and simulated mobile throttling. Those measurements do not establish low-end-phone performance.

After the full-suite checkpoint, a singular/plural wording repair passed four targeted i18n checks, two browser cases, lint, types and a new production export. The Lighthouse results above use that wording build. Parser assumption comments were added with unchanged emitted logic. A later documentation refresh does not change runtime behavior.

## GitHub verification

The public source commit `e1531b6b49535bbdab47402f732de72f382f937a` passed the [complete GitHub workflow](https://github.com/KingEmma7/momo-lens/actions/runs/40086752635) on 24 October 2026: frozen install, archive-security regressions, lint, types, coverage, production build, browser tests and Lighthouse. Later documentation corrections do not change application behavior. The [Actions page](https://github.com/KingEmma7/momo-lens/actions) shows checks for subsequent commits.

## Privacy, recovery and offline checks

The browser suite covers synthetic CSV/PDF import, repeated headers, wrapped descriptions, unsupported/image-only files, encrypted-PDF retry, a 10,001-row import, virtualized review, generic mapping, overlapping imports, categories, remembering and deletion during parsing.

Repeated cancellation and restart produced zero HTTP requests after parser readiness. Remote deletion during a held parse cancelled it without restoring rows. A synthetic password PDF unlocked offline with service workers blocked. Initial application downloads, service-worker updates and deliberately opened provider links can use the network; [PRIVACY.md](PRIVACY.md) explains that boundary.

A native Chrome one-byte storage quota caused the expected warning and memory-only fallback. A separate injected deletion-write failure cleared the open session and warned that removing an inaccessible saved copy could not be confirmed. A two-release browser check preserved old tabs while a new worker waited, activated after those tabs closed, cleaned the old owned cache and imported synthetic rows offline. A desktop Chrome PWA installed and worked offline, then was removed.

Mock share cancellation, share rejection, PNG failure and download fallback were checked. Actual phone share-sheet delivery was not. The earlier 10,000-row performance observation included import long tasks of 381ms, 100ms and 140ms; that observation was not repeated on the final build. Import is not claimed to be free of long tasks.

## Reproduce the maintained checks

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:archive-security
pnpm exec playwright install chromium
pnpm build
pnpm test:e2e
pnpm exec lhci autorun
pnpm format:check
```

`test:coverage` already runs the unit suite. Browser tests start their own server. The [CI workflow](../.github/workflows/ci.yml) runs the maintained automation. Independent fault and lifecycle probes above describe the recorded audit and are not all part of that workflow.

## Limits to retain

- MTN and Telecel parsers use documented provisional layouts and invented fixtures. Representative provider layouts remain unverified. No real customer statement was opened or retained. [PARSERS.md](PARSERS.md) describes dates, charges, duplicates and ambiguous reference-free rows. AT and XLSX are outside the verified V1 formats.
- Twi remains a draft with English fallback, pending native-speaker review. See [I18N.md](I18N.md).
- Physical Android/iOS behavior, native spoken screen readers, mobile share delivery and browser memory exhaustion remain unverified. Automated checks and emulation do not replace those sessions.
- [SECURITY.md](../SECURITY.md) documents the local extract-zip patch, its private-directory requirement, unverified native Windows behavior and two unsuppressed registry advisories. A clean registry audit is not claimed.
- Hosts must preserve the generated CSP and response headers. Follow [DEPLOYMENT.md](DEPLOYMENT.md) and verify the actual response after deployment.

Older `docs/reports/` files and screenshots retain their original provenance and may show earlier counts. Detailed local audit records are archived separately. This page identifies the later measured checkpoint and its limited wording delta.
