# 0001: Process statements in a static client application

Status: accepted

## Context

Everyday MoMo users need a way to understand a statement without giving its contents to another service. The first release must work on mid-range Android devices and after the first online load.

## Decision

Use a Next.js static export. Parse selected files in a Comlink Web Worker, using local PDF.js assets and Papa Parse. Store money in integer pesewas and keep data in memory by default. Explicit remembering uses IndexedDB. Classification uses deterministic local rules. Charts have data tables, and unfamiliar CSVs use an explicit column mapper.

No application server, API upload, account, sync, analytics, remote font, or remote worker is introduced. The service worker caches the application shell and synthetic assets for offline use.

## Consequences

Users keep control of statement data and can self-host the app. Parsing still depends on layout evidence, so synthetic fixtures and documented assumptions are necessary. Browser storage can fail or be cleared. Device and same-origin compromises remain outside the app's protection. Static hosts must deliver security headers, and release validation must verify offline behavior and zero requests during parsing after local assets are ready.
