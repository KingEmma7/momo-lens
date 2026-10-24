# Security policy

Do not post a private statement, account identifier, phone number, PIN, OTP, password, or transaction data in a public issue.

## Report a vulnerability

[Report a vulnerability privately](https://github.com/KingEmma7/momo-lens/security/advisories/new) through GitHub's private reporting form. Include only synthetic reproduction data. If the form is unavailable, open an issue asking for a private channel without describing the vulnerability. Do not publish credentials, personal records or exploit details in a public issue.

Include the affected release or commit, browser and operating system, a synthetic reproduction, expected behavior, actual behavior, and the security impact. Keep disclosure private until maintainers have assessed the report and agreed a fix and disclosure plan. There is no guaranteed response time or bug bounty.

## Supported versions

Until a release policy is established, only the latest published release and the default branch receive fixes. Release maintainers should document version support before tagging a stable release.

## Security design

- The application is a static Next.js export. No server or API route receives statement data.
- Parsing uses a Web Worker and locally bundled PDF.js. No CDN worker is used.
- The Content Security Policy restricts connections to the same origin, forbids objects and embedding, and restricts form destinations.
- No analytics, remote fonts, third-party scripts, or automatic error reporting is included.
- Remembering data is explicit. Session-only mode is the default. IndexedDB remains readable to other code running under the same origin and browser profile.
- Application caches contain code and synthetic data, not selected statements.
- Dependency updates, host configuration, and build provenance still require release review.

Next's static export contains inline framework bootstrap scripts. After the build, `scripts/security-csp.mjs` computes exact SHA-256 hashes for those scripts and writes a restrictive CSP meta tag into every exported page. It also generates `out/_headers` with the union of script hashes. The development layout and Vercel source headers permit inline scripts because Vercel may resolve its repository configuration before the build runs; the generated per-page meta policy still restricts execution to its listed hashes. Browsers enforce both policies together. The policy permits WebAssembly compilation for local PDF.js, and inline styles for React layout. Do not assume that a meta CSP provides every HTTP-header protection: `frame-ancestors` must be delivered by the host as a header. Keep the host header files in deployments and check the production response.

Read [docs/PRIVACY.md](docs/PRIVACY.md) for the full data flow and limits. A Content Security Policy is one layer, not an independent audit or a guarantee against a compromised device or deployment.

## Dependency review, 23 October 2026

The audit updated PostCSS, tmp, uuid, basic-ftp and compression through explicit pnpm overrides. The remaining extract-zip 2.0.1 dependency belongs to Lighthouse CI's browser installer, outside the static application's statement-processing path. No published fixed version was available during this review.

`patches/extract-zip@2.0.1.patch`, applied through pnpm's `patchedDependencies`, adds extraction-path and symlink-target checks and refuses file writes through final symlinks where the platform provides `O_NOFOLLOW`. It preserves tested internal, parent-relative and forward framework links. `pnpm test:archive-security` exercises the actual installed Lighthouse dependency chain with 20 ordinary and malicious archive cases. CI runs this check after installation. All 20 passed on macOS and Linux, and an independent review repeated the previously failing forward-link case and additional escaping/cyclic chains.

Use a private extraction directory whose parent paths cannot be changed by another actor during extraction. The patch does not protect against adversarial concurrent replacement of parent directories. The same 20 checks also passed in Linux ARM64 under Node 22 Alpine. The patched extractor unpacked the complete official Chrome for Testing 156.0.8078.47 macOS ARM64 ZIP (344 files and five contained symlinks), and that extracted browser launched successfully. Native Windows execution remains NOT VERIFIED. These checks do not establish compatibility with every browser archive or platform.

Registry audit still identifies version 2.0.1 under [symlink target traversal](https://github.com/advisories/GHSA-jmr9-qjv8-65gv) and [duplicate-entry writes through a symlink](https://github.com/advisories/GHSA-7pqw-9j4j-h8q3). Both high-severity warnings remain visible and are not suppressed. Registry metadata does not evaluate the local source patch, so a clean audit result is not claimed. Review the patch and its tests before release; replace it with an independently verified upstream fix when one becomes available, then rerun the archive checks.
