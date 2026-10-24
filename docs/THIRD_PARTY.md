# Third-party notices

The project source uses the MIT licence. Dependencies and fonts retain their own licences.

The development and production build commands run `scripts/third-party-notices.mjs`. It reads the installed production dependency graph, preserves copyright and licence text, includes Next.js vendored components and writes `/THIRD_PARTY_NOTICES.txt` into the browser's public files. The generated file is intentionally excluded from Git and included in the built site. Keep it with the delivered browser assets. Generation fails when a package needs a notice that has not been reviewed.

The notice file deliberately includes installed build and server JavaScript dependencies as well as browser code. It does not assert that every listed package is bundled into the app. Native optional SWC, sharp/libvips and Node canvas binaries are installed tools and are not copied into the browser output. The development-only extract-zip dependency has the separately documented source patch. The bundled Inter Tight WOFF2 files are derived from the upstream font by instancing and subsetting with FontTools and Brotli; they retain the upstream copyright and OFL notice.

## Distribution review, 23 October 2026

- MIT, ISC, BSD and 0BSD notices are retained with their copyright statements.
- Apache-2.0 licence text and packaged NOTICE files are retained. PDF.js's original worker header is preserved when it is copied.
- The OFL notice accompanies the derived Inter Tight font files. The included upstream copyright notice declares no Reserved Font Names.
- CC-BY-4.0 data and MPL-2.0 tools occur in the installed build graph. Their notices are retained conservatively. Their native binaries and source are not embedded in the browser application.
- LGPL libvips is an optional native image-processing dependency of the framework. The static browser output contains no libvips binary. A future standalone server/container distribution containing native dependencies requires its own binary/source distribution review; the current source checkout installs these packages from their upstream archives.

Review new dependencies and regenerate notices when updating the lockfile. Do not remove notices from the delivered assets. Repository publication does not publish `node_modules`, native dependencies, browser testing downloads or local audit data.

## Fonts and upstream notice files

Inter Tight's original OFL file remains at `public/fonts/OFL.txt` and is included in the generated notice file. The licence generator also retains the Victory vendor copies of D3 and InternMap notices.

Two npm archives omit a root licence file. The reviewed upstream texts are saved locally so builds remain offline:

- `docs/licenses/react-remove-scroll-bar-2.3.8.txt`: [upstream repository licence](https://github.com/theKashey/react-remove-scroll-bar/blob/master/LICENSE), retrieved 23 October 2026. The repository and npm metadata declare version 2.3.8 and MIT. The npm gitHead was unavailable upstream, so this is a repository notice rather than a claimed exact-commit retrieval.
- `docs/licenses/victory-vendor-37.3.6.txt`: [release-tag licence](https://github.com/FormidableLabs/victory/blob/v37.3.6/LICENSE.txt), retrieved 23 October 2026. Individual vendored ISC/MIT notices are collected from the installed package as well.

The development-only extract-zip source patch retains its upstream BSD-2-Clause copyright and licence in `patches/extract-zip.LICENSE.txt`. This notice accompanies the patch even though the extractor is not part of the browser build.
