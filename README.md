# MoMo Lens

**Your file never leaves your browser. No uploads, no accounts, no tracking.**

MoMo Lens is an open source, in-browser analyzer for Ghana mobile money statements. Import a statement, review the transactions, and see spending by month, category, and counterparty. It works without a server processing your statement.

Demo: `https://YOUR-DEPLOYMENT.example` (replace when a public release is available).

MoMo Lens is not affiliated with MTN or Telecel. This is a community project. Parser results are estimates derived from statement text. Check your statement before relying on a total or classification. Real, safely redacted statements are still needed to validate provider layouts.

## Features

- Local PDF and CSV import, with a column mapper for unfamiliar CSV layouts.
- Synthetic MTN MoMo Ghana and Telecel Cash Ghana fixtures with documented layout assumptions.
- Worker-based parsing, integer-pesewa amounts, duplicate detection, and separate fees and levies when the statement exposes them.
- Transaction search, filtering, recategorization, and counterparty rules.
- Period totals, monthly activity, categories, top counterparties, fees, biggest spends, and airtime and data totals.
- MoMo Wrapped PNG cards. Exact amounts and names are hidden by default.
- Session-only use by default. Remembering transactions on the device requires an explicit choice.
- Local deletion, offline PWA support, accessible chart tables, English, and a partial Twi translation marked for native-speaker review.

## Run locally

Use the Node and pnpm versions declared in `package.json`.

```sh
pnpm install
pnpm dev
```

Open [localhost:3000](http://localhost:3000). For a production build:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm exec playwright install chromium
pnpm build
pnpm test:e2e
pnpm exec serve out -l 3000
```

`pnpm build` creates a fully static export in `out/`. `pnpm test:e2e` starts its configured local server. Do not run a second server on the same test port. Test fixtures contain invented people, numbers, references, and amounts. Do not replace them with a private statement. The committed encrypted PDF uses the public test password `lens-demo`; `fixtures/generate-password-pdf.py` can regenerate it with the optional ReportLab Python package. Normal installation and CI do not require Python.

## Get a statement

Download a statement using your provider's official app or support channel, save the file on your device, then choose it in MoMo Lens. Enter a PDF password only in MoMo Lens's local password prompt. MoMo Lens does not need your MoMo PIN or OTP.

**MTN MoMo:** MTN's [official statement guide](https://help-center.mtn.com.gh/hc/en-us/articles/4405321306642-How-do-I-request-for-a-mobile-money-statement) describes the MyMTN app's MoMo and My Wallet statement flow. MTN also documents its [statement request platform](https://help-center.mtn.com.gh/hc/en-us/articles/36982586705298-Mobile-Money-Statement-Request). Follow the current provider instructions for date ranges and delivery. These links are external and open only when you select them.

**Telecel Cash:** Look for transaction history or statements in the official Telecel app. If a downloadable statement is unavailable, request one through official support. Telecel's [official terms](https://telecel.com.gh/support/terms/international-money-transfer-ts-cs/) describe statements available on request. We have not verified an app export flow or an XLSX export format. XLSX is therefore outside this release; export or convert a copy to CSV on your own device if needed.

Menus and supported formats may change. This guide was checked on 23 October 2026. Provider instructions verify how to request a statement, not that every resulting layout is supported.

## Privacy and local storage

Statement bytes are read by a local Web Worker. Parsed transactions remain in memory unless you turn on **Remember on this device**. Remembered data uses the browser's IndexedDB storage on this device. It is not encrypted separately from browser storage. Other people using the same browser profile may be able to see it. The app never uploads statements, sends transaction data to an API, or places statement data in URLs or logs.

Use **Delete all my data** to remove remembered transactions, rules, settings, and the current session. The PWA's application cache contains code and synthetic sample assets, not imported statements. Clearing browser site data also removes local data. Private browsing or a full device can prevent persistence; the app then keeps working in memory and shows a notice.

See [data flow and limitations](docs/PRIVACY.md), [parser assumptions](docs/PARSERS.md), and [security reporting](SECURITY.md). Hosting still receives ordinary requests for application files. Initial code downloads and deliberate navigation to external provider help pages require a network connection. No third-party scripts, hosted fonts, trackers, analytics, or automatic error-reporting services are used.

## Add or fix a parser

Read [PARSERS.md](docs/PARSERS.md) and [CONTRIBUTING.md](CONTRIBUTING.md). Start with a synthetic fixture that reproduces the layout. Keep private documents out of Git, issues, pull requests, screenshots, logs, and test reports. A safely redacted layout sample must preserve spacing, headings, date formats, and column order while replacing every personal value.

## Non-goals

MoMo Lens does not support bank statements, server-side statement processing, accounts or sync, AI or LLM features, SMS access, credit scoring, budgeting goals, MoMo API connections, analytics, or third-party scripts. It does not move money, calculate tax liability, advise on credit, or replace a provider's official statement.

## Verification

See [VERIFICATION.md](docs/VERIFICATION.md) for the actual checks run in this checkout, parser assumptions, measured coverage, and remaining gaps. Acceptance targets are Lighthouse mobile Performance 90+, Accessibility 100, Best Practices 95+, no serious or critical axe findings, and 90% line, function, branch, and statement coverage on parsers and categorization. A target is not a claim that a check passed.

Screenshots use synthetic sample data. Every route is shown at 1440 px desktop width and 360 px mobile width.

| Screen       | Desktop                                        | 360 px                                        |
| ------------ | ---------------------------------------------- | --------------------------------------------- |
| Home         | [View](docs/screenshots/home-desktop.png)      | [View](docs/screenshots/home-mobile.png)      |
| Import       | [View](docs/screenshots/import-desktop.png)    | [View](docs/screenshots/import-mobile.png)    |
| Transactions | [View](docs/screenshots/review-desktop.png)    | [View](docs/screenshots/review-mobile.png)    |
| Overview     | [View](docs/screenshots/dashboard-desktop.png) | [View](docs/screenshots/dashboard-mobile.png) |
| MoMo Wrapped | [View](docs/screenshots/wrapped-desktop.png)   | [View](docs/screenshots/wrapped-mobile.png)   |
| Privacy      | [View](docs/screenshots/privacy-desktop.png)   | [View](docs/screenshots/privacy-mobile.png)   |
| About        | [View](docs/screenshots/about-desktop.png)     | [View](docs/screenshots/about-mobile.png)     |

[Actual Wrapped PNG export](docs/screenshots/wrapped-export.png), with names and exact amounts hidden. A walkthrough GIF remains a release placeholder.

## Deploy

No environment variables or secrets are needed. Build with `pnpm build`, then serve `out/` as static files. Vercel, Netlify, and Cloudflare Pages can serve this export. Keep trailing-slash directories intact so direct route loads resolve to the route's `index.html`.

- **Vercel:** use the included `vercel.json`, install with pnpm, and choose `out` as the output directory.
- **Cloudflare Pages:** use `pnpm build`, output `out`, and preserve `public/_headers`, which Next copies into the export.
- **Netlify:** publish `out` and copy the security header policy into Netlify's `_headers` configuration. The Cloudflare-format `_headers` file is compatible with the ordinary static-header syntax.

Serve over HTTPS for installation and Web Share support. Confirm that the host sends the CSP and the other supplied security headers. The production build adds exact inline-script hashes to each page's CSP meta tag and writes the stricter generated header policy to `out/_headers` and `out/csp-policy.txt`. Vercel's broader source header combines with the restrictive page policy; browsers enforce both. A private hosted preview may have host-level authentication; the application itself has no account system. Do not broaden the CSP to add analytics or external scripts.

Release checklist:

- [ ] Install from a clean clone using the pinned lockfile.
- [ ] Lint, typecheck, unit coverage, production export, E2E, axe, and Lighthouse pass.
- [ ] Import synthetic MTN, synthetic Telecel, unknown CSV, password-protected PDF, image-only PDF, and 10,000-row CSV.
- [ ] Confirm duplicate imports and overlapping periods do not double count.
- [ ] Test every route at 360 px and desktop, using only the keyboard.
- [ ] Confirm zero application network requests during and after parsing once parser assets are ready.
- [ ] Install, go offline, reload routes, import, and export Wrapped.
- [ ] Verify remember, private-mode fallback, quota fallback, reload, and deletion.
- [ ] Verify host security headers and the service worker update path.
- [ ] Replace the demo URL placeholder and add a walkthrough GIF.
- [ ] Review real safely redacted MTN and Telecel statements and update documented assumptions.
- [ ] Native speaker reviews the Twi strings.
- [ ] Review dependencies and license notices, then tag a release.

## License

MIT. See [LICENSE](LICENSE). Dependency licenses remain with their respective packages.

Inter Tight is bundled locally in regular (400) and semibold (600) weights under the SIL Open Font License. The font source was downloaded from the [official Google Fonts Inter Tight directory](https://github.com/google/fonts/tree/main/ofl/intertight) on 23 October 2026, instanced and subset with FontTools and Brotli to include Latin, Twi letters and the cedi symbol, then saved as WOFF2. The included [font license](public/fonts/OFL.txt) applies to those files. The app fetches fonts only from its own origin.
