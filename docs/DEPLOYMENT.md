# Deploy MoMo Lens

The public demo is [momo-lens.etagbor.workers.dev](https://momo-lens.etagbor.workers.dev/).

## Cloudflare Workers Static Assets

Use Node 22.23.4 and the repository's pinned pnpm 11.17.0. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm dlx wrangler@4.148.0 deploy
```

The deploy command requires an authorized Cloudflare login. `wrangler.jsonc` publishes the complete generated `out/` directory as static assets, with trailing-slash routes and a real 404 page. It adds no server code or database. Deploy at a dedicated origin: the service worker, parser assets and manifest use root-relative URLs, so a repository subpath such as `/momo-lens/` is not supported by this configuration.

Keep the generated `out/_headers`, including its exact inline-script hashes, and the `Cache-Control: no-cache` rule for `sw.js`. Do not replace the generated export headers with the broader source template. After deployment, check the home page and direct `/import/` and `/privacy/` routes, load synthetic sample data, parse a synthetic PDF, export Wrapped, delete local data, and verify offline reload after installation. Inspect CSP, worker MIME types and the service worker update behavior on the live HTTPS origin. Browser parsing must make no external requests.

## Other static hosts

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
- [ ] Verify the public demo URL and add a walkthrough GIF.
- [ ] Review real safely redacted MTN and Telecel statements and update documented assumptions.
- [ ] Native speaker reviews the Twi strings.
- [ ] Review dependencies and license notices, then tag a release.
