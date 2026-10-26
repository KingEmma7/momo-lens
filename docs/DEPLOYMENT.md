# Deploy MoMo Lens

The public demo is [momo-lens.etagbor.workers.dev](https://momo-lens.etagbor.workers.dev/).

## Automatic deployment after merge

Maintainers review and merge pull requests into protected `main`. After the exact merged commit passes every required CI verification job, the separate deployment job publishes that run's static artifact. No application build or dependency lifecycle script runs with Cloudflare credentials.

The `production` GitHub environment permits only the `main` branch. Its `CLOUDFLARE_API_TOKEN` secret has Editor access to this existing Worker; `CLOUDFLARE_ACCOUNT_ID` is an environment variable. Pull-request verification has no access to that environment or token. Main protection applies to administrators; the solo maintainer can merge their own reviewed PR, so this does not promise an independent second approver.

Before publishing, the job verifies the artifact's commit, run identity and file hashes, then checks that the commit is still current `main` and belongs to a merged PR. Deployments run one at a time, with [up to 100 pending jobs retained](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency#example-queueing-multiple-pending-runs). An older CI run finishing later cannot replace a pending newer release. Older successful runs are skipped if main has advanced. The deployment is not cancelled midway by a newer CI run. A main change during the final publish can briefly leave the preceding verified revision live until the newer revision passes and deploys.

The public `/__deployment.json` marker identifies the deployed commit and CI run. After publishing, CI checks that marker, the generated home-page security headers and a real 404 response. A failed live check marks the deployment job unsuccessful; it does not silently roll back or claim the previous site is still active. The artifact is retained for seven days. To retry a failed deployment, choose **Re-run all jobs** for the eligible main commit. **Re-run failed jobs** alone cannot reuse an artifact from an earlier run attempt. Expired artifacts also require a complete rerun.

## Rollback

For a routine rollback, merge a revert PR and let its successful CI publish normally. For an emergency manual rollback, pause this repository's CI workflow in GitHub Actions and wait for all active deployment jobs to finish. An authorized maintainer can inspect `wrangler deployments list` and run `pnpm dlx wrangler@4.148.0 rollback <VERSION_ID>` from this repository, or select the verified version in the Cloudflare dashboard. Only the 100 most recent published versions are eligible. Record the chosen version and check the live marker, security headers and routes. Re-enable CI and merge the corrective PR when ready; the next successful main deployment replaces the rollback.

See [Cloudflare's rollback guide](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/) and [Worker token scopes](https://developers.cloudflare.com/workers/authorization/workers/). Hosting credentials belong in the protected environment, never in source files, browser variables or build output.

## Cloudflare Workers Static Assets

Use Node 22.23.4 and the repository's pinned pnpm 11.17.0. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm dlx wrangler@4.148.0 deploy
```

The manual deploy command requires an authorized Cloudflare login. Pause automatic deployments and wait for any active deployment to finish before using it. `wrangler.jsonc` publishes the complete generated `out/` directory as static assets, with trailing-slash routes and a real 404 page. It adds no server code or database. Deploy at a dedicated origin: the service worker, parser assets and manifest use root-relative URLs, so a repository subpath such as `/momo-lens/` is not supported by this configuration.

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
