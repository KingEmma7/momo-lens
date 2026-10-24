# Statement parsers

MoMo Lens ships two provisional provider parsers and a generic CSV mapper. The fixtures contain invented names, numbers, references and balances. They are examples, never real customer statements. A successful parse does not prove that a balance reconciles to a provider account. Always compare the review screen with the source statement.

## Evidence checked on 23 October 2026

- [MTN Ghana: Mobile Money Statement Request](https://help-center.mtn.com.gh/hc/en-us/articles/36982586705298-Mobile-Money-Statement-Request) describes the official statement portal, date selection and downloads. It does not publish an export schema.
- [MTN Ghana: requesting a mobile money statement](https://help-center.mtn.com.gh/hc/en-us/articles/4405321306642-How-do-I-request-for-a-mobile-money-statement) describes MyMTN and USSD statement requests. Neither source confirms CSV or XLSX export.
- The existing Telecel prototype assumes CDR-style headers: `Receipt NO`, `Completion time`, `Initiation Time`, `Details`, `Transaction Status`, `Paid In`, `Withdrawn`, `Balance`, and `Opposite Party`. This audit did not obtain a provider-owned schema confirming them. It used only the existing synthetic fixtures; no real customer statement was opened, downloaded or retained for verification.
- [Telecel Cash terms](https://telecel.com.gh/support/terms/international-money-transfer-ts-cs/) confirm transaction records, unique receipt numbers and statement requests, but do not specify an export schema.

Public screenshots and third-party descriptions suggest that MTN statements can contain Date & Time, Payment Type, To/From, Account Name, Amount, Fees, Tax, Balance, Transaction ID and Reference. These remain unverified layout assumptions because no provider-owned schema was available. No XLSX support is included because a provider XLSX export could not be confirmed.

## Conditional formats and providers

The original V1 scope names MTN Ghana and Telecel Ghana. AT Money remains an extension, with no invented provider parser or claim of native compatibility. The accessible [AT customer-care page](https://www.at.com.gh/personal/customer-care) did not establish a downloadable statement field schema. Users can try a local CSV through the generic mapper, but that is not evidence of an AT export format. XLSX remains conditional because the reviewed official sources did not establish an XLSX export. This limit is disclosed rather than guessed.

The official links were rechecked on 23 October 2026. MTN's guide dated 6 July 2026 describes its statement portal and date selection; its guide dated 20 November 2024 describes MyMTN and USSD requests. Those sources establish request methods, not compatibility with every resulting document. The original scope explicitly permits synthetic layouts and documented assumptions. Representative, safely redacted provider layouts would improve confidence beyond these fixtures.

## Explicit assumptions

These assumptions also appear as `// ASSUMPTION:` comments near the corresponding code.

1. **MTN table:** the columns above exist as separate extractable text columns. Amount is signed, and Fees and Tax are additional deductions rather than amounts already included in principal. A CSV version using these labels is synthetic, not a confirmed provider export.
2. **Telecel table:** the provisional CDR-style header list represents a useful Telecel Ghana variant. A CSV with those labels is a synthetic equivalent, not a confirmed export feature. Withdrawn values are principal debits, even if already negative. Paid In values are credits.
3. **Fees:** only explicit fee/tax columns and clearly labelled standalone fee or levy rows count as fees. A fee word embedded in a transfer or merchant narrative does not make its principal a fee. Ambiguous `Payment To` rows are not guessed to be fees or attached to another transaction. Fees are never calculated from current tariffs. Old E-Levy rows are recognised without assuming any current levy applies.
4. **PDF geometry:** the worker starts a new line when text-item y positions differ by more than 3 points and inserts two spaces when the horizontal gap exceeds 12 points. It assumes PDF item order follows visual reading order. Rows start with the mapped date cell. The parser handles repeated full headers/footers and description continuations across page boundaries. PDFs with fragmented or reordered cells need a redacted fixture and parser fix. No OCR is performed.
5. **Dates:** numeric dates are day/month/year. Text dates accept three-letter English month names. A missing time means midnight in Africa/Accra (UTC+0). Dates outside 1900 to 2200 are rejected.
6. **CSV:** files have a header row. A title/preamble is allowed when a recognised header follows. The mapper uses the first row when the header is unknown. Signed Amount columns use positive for money in and negative or brackets for money out. Debit/Credit columns use their labels regardless of numeric sign. Both nonzero in one row are rejected. More than two decimal places is rejected rather than silently rounded.
7. **Counterparties:** an explicit name column is preferred. Ghana phone patterns found in the name or description are masked before they enter the transaction model. Imported raw descriptions are otherwise kept locally. Unknown counterparties stay unknown.
8. **Identity:** rows with a provider reference use a deterministic 64-bit hash of provider, UTC date/time, signed amount and reference. Narrative wrapping and counterparty formatting therefore do not duplicate a referenced transaction across exports. Reference-free rows additionally include charges, description and counterparty, and remain ambiguous when genuinely distinct transactions are identical. Version-one saved referenced rows migrate to the new identity on load, preserving explicit user categories when duplicates merge. A contact key derived locally from a normalized phone number, or a name when no number exists, keeps new counterparty rules and rankings separate when masked phone labels collide. Older saved rows may lack this contact key; reimporting a synthetic or safely retained statement is necessary to recover distinctions that were not stored. The review warning reports removed duplicate rows.
9. **Reversals:** reversals are separate credits or debits. The analyzer preserves both original and reversal, so gross outflow still includes the original transaction and net cash flow reflects the returned money. It does not guess which transaction was reversed.
10. **Provider detection:** brand text in the file name or preamble plus recognised date/money/description headers yields high confidence. This is heuristic, not provider authentication. Unknown layouts open the mapper.

## Accounting

Money is stored as safe integer pesewas. `amount` is nonnegative principal, `direction` carries its sign, and `fee` and `levy` are separate nonnegative charges. Total out includes principal on outgoing rows plus all explicit fees and levies. Total in includes incoming principal. Outgoing category totals split the principal into its category and attached fees/levies into Fees & levies. Their sum therefore equals total out. A standalone fee row contributes its amount once. Incoming reversals remain separate credits. Totals describe recorded cash flows, not an account balance or audited financial advice.

## Add or fix a parser with a redacted statement

1. Work locally with a copy. Replace names, phone numbers, account identifiers, national IDs, references, balances and narrative details. Use invented values consistently. Remove metadata, annotations, embedded attachments and hidden layers. Rendering a black box over text is not redaction.
2. Extract text locally and inspect both the rendered document and the extracted text. Check that no private value remains. Never upload a live statement to an issue, chat service, third-party converter or CI artifact.
3. Prefer building a fresh synthetic CSV/PDF that preserves column positions, repeated headers and wrapping. Retain only layout facts. Document where the layout came from and when it was checked.
4. Add a module implementing `StatementParser` with `detect(file, text)` returning confidence and `parse(input)` returning a validated `ParseResult`. Register it in `lib/parsers/registry.ts`. Detection must require both provider evidence and valid structural headers.
5. Add a synthetic fixture and exact expected transaction JSON. Add tests for dates, currency strings, fees, repeated headers, wrapping, skipped rows and duplicates. Do not infer charges from tariffs.
6. Run `pnpm test:coverage`, `pnpm typecheck`, `pnpm lint`, `pnpm test:e2e` and `pnpm build`. Verify totals against the fixture by hand. Add every new assumption here with a matching code comment.
7. Open a parser issue with provider, export method, approximate export date, observed column labels and a synthetic reproduction. Share a redacted original privately only when maintainers have agreed on a secure route.

The current parsers need representative, safely redacted MTN and Telecel statements before their detection thresholds and PDF behavior can be considered hardened. They deliberately reject uncertain rows instead of inventing amounts.
