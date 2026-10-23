# Security policy

Do not post a private statement, account identifier, phone number, PIN, OTP, password, or transaction data in a public issue.

## Report a vulnerability

Use the repository's **Security > Advisories > Report a vulnerability** feature for a private report. Maintainers must enable private vulnerability reporting before a public release. If that feature is unavailable, open an issue that only asks maintainers to enable a private reporting channel. Do not include exploit details or sensitive files in that public issue. This repository does not invent a maintainer email address.

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
