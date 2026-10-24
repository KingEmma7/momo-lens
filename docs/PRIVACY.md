# Privacy and data flow

Your statement is processed on your device. MoMo Lens has no statement-upload endpoint, account service, sync service, tracking, analytics, AI call, or automatic error-reporting service.

## What happens when you import

1. You choose a file or drop it into the import screen. The browser gives the local app access to that selected file.
2. A Web Worker reads CSV text or uses the locally bundled PDF.js library to extract PDF text. A PDF password, if needed, stays in the local parsing process.
3. A provider parser, or your explicit CSV column mapping, normalizes transaction rows. Amounts become integer pesewas. Rules classify transactions without a network call.
4. The app holds transactions in memory. Charts, tables, search, rules, and share cards are computed locally.
5. Only if you turn on **Remember on this device** does the app store transactions, rules, and settings in this browser profile's IndexedDB.

Raw statement files are not retained in IndexedDB. Transaction descriptions and names can still be sensitive. Remembering data on a shared browser profile may expose it to another person using that profile. Browser storage is not protected by a separate MoMo Lens password or encryption key.

## Network activity

The browser downloads the app's own HTML, JavaScript, style, worker, PDF.js assets, icons, and synthetic sample. The service worker caches application assets for offline use. These requests reveal ordinary hosting metadata, such as IP address and user agent, to the static host. Hosting logs and policies are controlled by the host.

Imported statement bytes, passwords, transaction fields, names, and amounts are never intentionally placed in a request, URL, log, or error report. The parsing E2E test observes requests after local parser assets are ready and requires none during and after import. Before enabling file selection, the production app retains its build-listed parser code and PDF worker code in memory. Cancelling a parse terminates its worker; a replacement starts from those same local Blob URLs without HTTP requests. These blobs contain only public application code, never file bytes, passwords or transactions. Two Blob URLs are reused across repeated cancellations and released when the page unloads. Developer hot reload may fetch local development assets. The Content Security Policy limits connections to the app's own origin; CSP alone is not proof that application code cannot transmit to that origin. Source review and the request test complement it.

A browser extension, compromised device, modified deployment, or software supply-chain compromise may bypass these protections. The app cannot secure the rest of your device. Inspect a deployment's source and release provenance if that matters to your use.

## Session use and remembering

Session-only is the default. Reloading or closing the page discards the in-memory session unless persistence was explicitly enabled. Disabling remembering removes saved data. The app reports unavailable storage and quota failures and continues in memory. A notice means the latest changes may not survive reload.

Rules are saved with the remembered dataset when remembering is on. In session-only mode they last for that session. A local preference is not consent to upload anything.

## Delete all my data

The deletion control clears current transactions, saved transactions, rules, import-session information where stored, and settings. It returns to session-only defaults. Other open tabs receive a deletion notice and clear their sessions. A stale tab cannot save its old snapshot after deletion: a transaction checks a random deletion marker before writing. The marker contains no statement data and remains in a separate metadata store. Application assets cached for offline use may remain; these do not contain imported statements. To also remove application caches and browser-managed copies, clear this site's data in browser settings. The app cannot delete the original statement from Downloads or another app.

## Cancelling and offline updates

Cancel reading stops the active worker and discards its pending result. A cancellation epoch also prevents a parse paused at an asynchronous startup or file-read boundary from creating a replacement worker or returning a stale result. Leaving the import screen while parsing also cancels it. A new application version is cached separately and waits for existing tabs to close before activation, so it does not replace assets during an open statement session. A two-release Chromium check preserved an entered synthetic PDF password and an active synthetic import while the update waited. After both tabs closed, the new cache activated, the old cache was removed, and the new version imported offline.

## Share cards

Names and exact amounts start hidden. You can choose to reveal them before export. A generated PNG is local until you deliberately share it using your device's share sheet or send the downloaded image yourself. A share sheet may send the image to an app or service you select. Review the preview before sharing. Publicly shared images cannot be recalled by MoMo Lens.

## External links

Official provider help links take you to another website only when you choose them. Their privacy policies apply there. The app does not load provider widgets, pixels, remote fonts, or scripts.

## Limits

Parser evidence is incomplete. Synthetic fixtures establish known behavior and do not prove that every provider export is supported. Fees and levies are separated only when the source shows enough information. The app does not infer a current tax rate or rewrite a historical statement. Reversals remain visible so the period's money movement can be checked against the original statement.
