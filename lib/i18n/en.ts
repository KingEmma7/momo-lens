const aliases = {
  appName: 'MoMo Lens',
  home: 'Home',
  import: 'Import statement',
  review: 'Transactions',
  dashboard: 'Overview',
  wrapped: 'MoMo Wrapped',
  privacy: 'Your privacy',
  about: 'About',
  privacyPromise: 'Your statement never leaves your phone. No uploads, no accounts, no tracking.',
  trySample: 'Try with sample data',
  importStatement: 'Import my statement',
  rememberOnDevice: 'Remember on this device',
  sessionOnly: 'Session only',
  deleteData: 'Delete all my data',
  totalIn: 'Money in',
  totalOut: 'Money out',
  net: 'Net change',
  fees: 'Fees and levies',
  hideAmounts: 'Hide exact amounts',
  hideNames: 'Hide names',
  exportPng: 'Save image',
  share: 'Share',
  search: 'Search transactions',
  allCategories: 'All categories',
  allMonths: 'All months',
  allTypes: 'All types',
  viewTable: 'View as table',
  viewChart: 'View chart',
  continue: 'Continue',
  cancel: 'Cancel',
  loading: 'Getting things ready…',
  offlineReady: 'Ready offline',
  language: 'Language',
  nativeReview: 'Twi translations are a draft and need native-speaker review.',
} as const;

// English source strings are stable, typed message keys. Interpolation uses named placeholders.
const en = {
  ...aliases,
  '%': '%',
  '% read': '% read',
  '+ ': '+ ',
  ', including explicit fees and levies.': ', including explicit fees and levies.',
  '.': '.',
  ': ': ': ',
  'A clear record of your mobile money.': 'A clear record of your mobile money.',
  'A promise you can check.': 'A promise you can check.',
  'A summary of the selected period. Names and exact amounts are hidden by default.':
    'A summary of the selected period. Names and exact amounts are hidden by default.',
  'About MoMo Lens': 'About MoMo Lens',
  'Across ': 'Across ',
  'After the app’s files load, parsing and analysis use no network requests. You can disconnect from the internet and keep using the app. The source includes a network test so contributors can check this.':
    'After the app’s files load, parsing and analysis use no network requests. You can disconnect from the internet and keep using the app. The source includes a network test so contributors can check this.',
  Airtime: 'Airtime',
  'All categories': 'All categories',
  'All months': 'All months',
  'All time': 'All time',
  'All types': 'All types',
  'All your saved transactions, rules and settings have been deleted.':
    'All your saved transactions, rules and settings have been deleted.',
  Amount: 'Amount',
  'Amount column': 'Amount column',
  'Amount is not a valid cedi value.': 'Amount is not a valid cedi value.',
  'Apply to all from this counterparty': 'Apply to all from this counterparty',
  Ascending: 'Ascending',
  'Balance column': 'Balance column',
  'Biggest single spends': 'Biggest single spends',
  'Bills & utilities': 'Bills & utilities',
  'Both debit and credit have values.': 'Both debit and credit have values.',
  'Built for the way Ghana moves money.': 'Built for the way Ghana moves money.',
  'By default, your data lives in this open page. Close it and your transactions and category rules disappear.':
    'By default, your data lives in this open page. Close it and your transactions and category rules disappear.',
  'CSV import': 'CSV import',
  'Cancel reading': 'Cancel reading',
  'Cash out': 'Cash out',
  'Categories total ': 'Categories total ',
  'Categories total {amount}, including explicit fees and levies.':
    'Categories total {amount}, including explicit fees and levies.',
  Category: 'Category',
  'Category updated for all transactions from {counterparty}.':
    'Category updated for all transactions from {counterparty}.',
  'Category updated for all transactions from {value1}.':
    'Category updated for all transactions from {value1}.',
  'Change category': 'Change category',
  'Change category for {value1}': 'Change category for {value1}',
  'Checking dates and money amounts': 'Checking dates and money amounts',
  'Choose a PDF or CSV statement.': 'Choose a PDF or CSV statement.',
  'Choose a PDF or CSV statement. Spreadsheet exports are not supported yet.':
    'Choose a PDF or CSV statement. Spreadsheet exports are not supported yet.',
  'Choose a category for this transaction.': 'Choose a category for this transaction.',
  'Choose a column': 'Choose a column',
  'Choose a valid category.': 'Choose a valid category.',
  'Choose an amount column, or debit and credit columns.':
    'Choose an amount column, or debit and credit columns.',
  'Choose existing date, description and amount columns.':
    'Choose existing date, description and amount columns.',
  'Choose file': 'Choose file',
  'Choose statement file': 'Choose statement file',
  'Choose the statement columns': 'Choose the statement columns',
  'Choose your statement': 'Choose your statement',
  'Clear filters': 'Clear filters',
  Close: 'Close',
  'Close category editor': 'Close category editor',
  'Close other MoMo Lens tabs to finish saving on this device.':
    'Close other MoMo Lens tabs to finish saving on this device.',
  'Contributors can add parsers, review the Twi translations and improve accessibility. Redact personal details before sharing an example with a contributor.':
    'Contributors can add parsers, review the Twi translations and improve accessibility. Redact personal details before sharing an example with a contributor.',
  Counterparty: 'Counterparty',
  'Counterparty column': 'Counterparty column',
  'Create MoMo Wrapped': 'Create MoMo Wrapped',
  'Creates a rule for matching transactions, including future imports.':
    'Creates a rule for matching transactions, including future imports.',
  'Creating PNG…': 'Creating PNG…',
  'Credit column': 'Credit column',
  'Data bundles': 'Data bundles',
  'Data was deleted in another tab. This session has been cleared.':
    'Data was deleted in another tab. This session has been cleared.',
  'Data, airtime and charges': 'Data, airtime and charges',
  Date: 'Date',
  'Date column': 'Date column',
  'Date is not recognised. Use day/month/year or ISO dates.':
    'Date is not recognised. Use day/month/year or ISO dates.',
  'Date is outside the valid calendar.': 'Date is outside the valid calendar.',
  'Debit column': 'Debit column',
  'Delete all my data': 'Delete all my data',
  'Delete all your data?': 'Delete all your data?',
  'Delete saved data': 'Delete saved data',
  'Deleting…': 'Deleting…',
  Descending: 'Descending',
  'Description column': 'Description column',
  'Description is missing.': 'Description is missing.',
  Dismiss: 'Dismiss',
  'Dismiss notice': 'Dismiss notice',
  'Download PNG': 'Download PNG',
  'Drop your statement here': 'Drop your statement here',
  'Edit categories': 'Edit categories',
  English: 'English',
  'English today. Twi translations are prepared for native-speaker review.':
    'English today. Twi translations are prepared for native-speaker review.',
  'Explore a sample statement': 'Explore a sample statement',
  'Explore your overview, or make a private MoMo Wrapped card.':
    'Explore your overview, or make a private MoMo Wrapped card.',
  'Export settings': 'Export settings',
  Fees: 'Fees',
  'Fees & levies': 'Fees & levies',
  'Finish import': 'Finish import',
  'First rows from your file': 'First rows from your file',
  'Get your statement': 'Get your statement',
  'Getting your private file reader ready…': 'Getting your private file reader ready…',
  'Here’s what happens to your file.': 'Here’s what happens to your file.',
  Hidden: 'Hidden',
  'Hide amounts': 'Hide amounts',
  'Hide names': 'Hide names',
  'How it works': 'How it works',
  'Import a PDF or CSV to review your transactions.':
    'Import a PDF or CSV to review your transactions.',
  'Import a statement to create a summary.': 'Import a statement to create a summary.',
  'Import a statement to see its transactions.': 'Import a statement to see its transactions.',
  'Import a statement to see your transactions and totals.':
    'Import a statement to see your transactions and totals.',
  'Import it here. Review the transactions and fix categories if needed.':
    'Import it here. Review the transactions and fix categories if needed.',
  'Import my statement': 'Import my statement',
  'Import statement': 'Import statement',
  'Import summary': 'Import summary',
  'In MyMTN, open MoMo, then My Wallet and look for a detailed statement. Choose a period and save the PDF. Menus may change.':
    'In MyMTN, open MoMo, then My Wallet and look for a detailed statement. Choose a period and save the PDF. Menus may change.',
  'It runs entirely on your device. It is free and open source, with no accounts, adverts or analytics.':
    'It runs entirely on your device. It is free and open source, with no accounts, adverts or analytics.',
  Item: 'Item',
  'Keep control of your data': 'Keep control of your data',
  'Keep counterparty names private': 'Keep counterparty names private',
  'Keep exact amounts private': 'Keep exact amounts private',
  'Keep my data': 'Keep my data',
  Language: 'Language',
  'Let’s make sense of your MoMo.': 'Let’s make sense of your MoMo.',
  Levies: 'Levies',
  'Load sample data': 'Load sample data',
  'Loading chart…': 'Loading chart…',
  'Loading your local workspace…': 'Loading your local workspace…',
  'Loading…': 'Loading…',
  'Local PDF worker did not start.': 'Local PDF worker did not start.',
  'MIT licensed. Built for everyday Ghanaian mobile money users, and for contributors who want to make it better.':
    'MIT licensed. Built for everyday Ghanaian mobile money users, and for contributors who want to make it better.',
  'MTN MoMo': 'MTN MoMo',
  'Made with MoMo Lens': 'Made with MoMo Lens',
  'Main navigation': 'Main navigation',
  'Match your columns': 'Match your columns',
  'Meet your MoMo Wrapped.': 'Meet your MoMo Wrapped.',
  'Merchant payments': 'Merchant payments',
  'MoMo Lens': 'MoMo Lens',
  'MoMo Lens is an independent project, not affiliated with MTN or Telecel. It provides a view of your statement, not financial advice.':
    'MoMo Lens is an independent project, not affiliated with MTN or Telecel. It provides a view of your statement, not financial advice.',
  'MoMo Lens turns your MTN MoMo or Telecel Cash statement into a clear picture of your money. See who you send to, what you spend on, and how much goes to fees, airtime and data.':
    'MoMo Lens turns your MTN MoMo or Telecel Cash statement into a clear picture of your money. See who you send to, what you spend on, and how much goes to fees, airtime and data.',
  'MoMo Lens | Your money, a clearer picture': 'MoMo Lens | Your money, a clearer picture',
  'MoMo Lens · Independent, open source software.':
    'MoMo Lens · Independent, open source software.',
  'MoMo Wrapped': 'MoMo Wrapped',
  'MoMo Wrapped share card': 'MoMo Wrapped share card',
  'Mobile spending and explicit charges': 'Mobile spending and explicit charges',
  'Money in': 'Money in',
  'Money in: ': 'Money in: ',
  'Money must be a safe integer number of pesewas.':
    'Money must be a safe integer number of pesewas.',
  'Money out': 'Money out',
  'Money out: ': 'Money out: ',
  Month: 'Month',
  'Monthly money in and out': 'Monthly money in and out',
  'Monthly money in and out, including fees': 'Monthly money in and out, including fees',
  'Most sent to': 'Most sent to',
  'My MoMo Wrapped': 'My MoMo Wrapped',
  'Names and exact amounts are hidden.': 'Names and exact amounts are hidden.',
  'Names and exact amounts are hidden. Transfer counts and category labels will be visible.':
    'Names and exact amounts are hidden. Transfer counts and category labels will be visible.',
  Net: 'Net',
  'Net change': 'Net change',
  'No analytics, third-party scripts, ads or remote fonts. Your file name, transactions and password never enter a URL or an error report.':
    'No analytics, third-party scripts, ads or remote fonts. Your file name, transactions and password never enter a URL or an error report.',
  'No connection to your MoMo account.': 'No connection to your MoMo account.',
  'No incoming transfers in this period.': 'No incoming transfers in this period.',
  'No outgoing spending': 'No outgoing spending',
  'No outgoing transfers in this period.': 'No outgoing transfers in this period.',
  'No reference': 'No reference',
  'No statement imported': 'No statement imported',
  'No statement selected': 'No statement selected',
  'No transactions in this period': 'No transactions in this period',
  'No transactions match.': 'No transactions match.',
  'No transactions matched the detected layout. Check the column mapping.':
    'No transactions matched the detected layout. Check the column mapping.',
  'No transactions to display.': 'No transactions to display.',
  'No transactions were found. Try a CSV export, or check the statement period.':
    'No transactions were found. Try a CSV export, or check the statement period.',
  'No transactions yet.': 'No transactions yet.',
  'No uploads, no accounts, no tracking.': 'No uploads, no accounts, no tracking.',
  'Not affiliated with MTN or Telecel.': 'Not affiliated with MTN or Telecel.',
  'Not imported': 'Not imported',
  'Not used': 'Not used',
  'Official MTN statement instructions': 'Official MTN statement instructions',
  'Offline setup is unavailable in this browser. You can still use MoMo Lens while this page is open.':
    'Offline setup is unavailable in this browser. You can still use MoMo Lens while this page is open.',
  'Only on this device': 'Only on this device',
  'Only turn this on for a device you trust. Anyone with access to this browser could see the saved transactions. Turning it off removes the saved copy.':
    'Only turn this on for a device you trust. Anyone with access to this browser could see the saved transactions. Turning it off removes the saved copy.',
  'Open to everyone.': 'Open to everyone.',
  'Optional. Otherwise your data disappears when you close this page.':
    'Optional. Otherwise your data disappears when you close this page.',
  Other: 'Other',
  'Outgoing categories': 'Outgoing categories',
  'PDF and CSV. No account required. Sample transactions are synthetic.':
    'PDF and CSV. No account required. Sample transactions are synthetic.',
  'PDF or CSV ': 'PDF or CSV ',
  'PDF password': 'PDF password',
  'Parser uses a documented synthetic layout. Check the results against your statement.':
    'Parser uses a documented synthetic layout. Check the results against your statement.',
  Period: 'Period',
  'Privacy & data': 'Privacy & data',
  'Privacy and local data': 'Privacy and local data',
  'Privacy and storage': 'Privacy and storage',
  'Provider layouts change. The included examples are synthetic. The MTN layout uses documented assumptions, and real statements may need the column mapper. Always compare the results with your original statement.':
    'Provider layouts change. The included examples are synthetic. The MTN layout uses documented assumptions, and real statements may need the column mapper. Always compare the results with your original statement.',
  'Read a PDF or CSV from MTN MoMo or Telecel Cash.':
    'Read a PDF or CSV from MTN MoMo or Telecel Cash.',
  'Read your MTN MoMo or Telecel Cash statement, check your transactions and see what you spent. No uploads, no accounts, no tracking.':
    'Read your MTN MoMo or Telecel Cash statement, check your transactions and see what you spent. No uploads, no accounts, no tracking.',
  'Reading cancelled. Choose a statement to try again.':
    'Reading cancelled. Choose a statement to try again.',
  'Reading sample…': 'Reading sample…',
  'Reading the statement columns': 'Reading the statement columns',
  'Reading the synthetic statement on your device…':
    'Reading the synthetic statement on your device…',
  'Reading this file took too long. Try a shorter statement period or a CSV export.':
    'Reading this file took too long. Try a shorter statement period or a CSV export.',
  'Reading your statement…': 'Reading your statement…',
  'Ready to import': 'Ready to import',
  Recipient: 'Recipient',
  'Relative amount': 'Relative amount',
  'Remember on this device': 'Remember on this device',
  'Remove every imported transaction, category rule and preference from this browser.':
    'Remove every imported transaction, category rule and preference from this browser.',
  'Request an electronic transaction statement from Telecel Cash support. Ask for a PDF with selectable text, or CSV if available.':
    'Request an electronic transaction statement from Telecel Cash support. Ask for a PDF with selectable text, or CSV if available.',
  Reversals: 'Reversals',
  'Review transactions': 'Review transactions',
  'Row ': 'Row ',
  'Row contains no money movement.': 'Row contains no money movement.',
  'Row has an invalid date or amount.': 'Row has an invalid date or amount.',
  'Row {row}: {reason}': 'Row {row}: {reason}',
  'Save an electronic PDF or CSV from your provider. Scanned images cannot be read yet.':
    'Save an electronic PDF or CSV from your provider. Scanned images cannot be read yet.',
  'Save an electronic PDF or CSV statement from your provider.':
    'Save an electronic PDF or CSV statement from your provider.',
  'Save category': 'Save category',
  'Save transactions, category rules and preferences in this browser.':
    'Save transactions, category rules and preferences in this browser.',
  'Saved category rules': 'Saved category rules',
  'Scanned PDF? Ask your provider for a text PDF or CSV. Photos cannot be read yet.':
    'Scanned PDF? Ask your provider for a text PDF or CSV. Photos cannot be read yet.',
  'Scroll sideways to see categories and amounts.':
    'Scroll sideways to see categories and amounts.',
  'Scrollable table': 'Scrollable table',
  'Scrollable transactions': 'Scrollable transactions',
  'Search a name, number or reference': 'Search a name, number or reference',
  'Search transactions': 'Search transactions',
  'Search, sort and change categories.': 'Search, sort and change categories.',
  'See all transactions': 'See all transactions',
  'Select a category to change it': 'Select a category to change it',
  Sender: 'Sender',
  'Session-only by default. Saving on this browser is optional, and you can delete saved data at any time.':
    'Session-only by default. Saving on this browser is optional, and you can delete saved data at any time.',
  Share: 'Share',
  'Share directly on supported phones, or download the PNG.':
    'Share directly on supported phones, or download the PNG.',
  'Shared with the privacy settings selected by me.':
    'Shared with the privacy settings selected by me.',
  'Sharing cancelled. You can download your card anytime.':
    'Sharing cancelled. You can download your card anytime.',
  'Show 100 more skipped rows': 'Show 100 more skipped rows',
  'Skip to content': 'Skip to content',
  'Some amounts could not be added safely. Review the rows or delete the data from Privacy & data, then import a shorter statement period.':
    'Some amounts could not be added safely. Review the rows or delete the data from Privacy & data, then import a shorter statement period.',
  'Some column names repeat. Rename duplicate CSV headers before mapping.':
    'Some column names repeat. Rename duplicate CSV headers before mapping.',
  'Sort by {value1}': 'Sort by {value1}',
  'Spending by category': 'Spending by category',
  'Statement instructions': 'Statement instructions',
  'Statement parsing progress': 'Statement parsing progress',
  'Statement period': 'Statement period',
  'Statement ready': 'Statement ready',
  'Still growing, with your help.': 'Still growing, with your help.',
  'Storage settings': 'Storage settings',
  'Synthetic sample': 'Synthetic sample',
  'Synthetic sample data. Import your statement to see your own figures.':
    'Synthetic sample data. Import your statement to see your own figures.',
  'Synthetic sample: {value1} invented transactions. This sample does not replace your saved data.':
    'Synthetic sample: {value1} invented transactions. This sample does not replace your saved data.',
  'Telecel Cash': 'Telecel Cash',
  'Telecel statement request information': 'Telecel statement request information',
  'That password did not open the PDF. Try again. Your password stays on this device.':
    'That password did not open the PDF. Try again. Your password stays on this device.',
  'That password did not unlock this PDF. Try again.':
    'That password did not unlock this PDF. Try again.',
  'The MIT-licensed source repository will be linked here when this project is released publicly.':
    'The MIT-licensed source repository will be linked here when this project is released publicly.',
  'The file reader could not restart. Refresh this page and try again.':
    'The file reader could not restart. Refresh this page and try again.',
  'The file reader could not start. Refresh this page and try again.':
    'The file reader could not start. Refresh this page and try again.',
  'The local parser could not start. Reload this page and try again.':
    'The local parser could not start. Reload this page and try again.',
  'The sample contains synthetic transactions. Your saved data stays separate.':
    'The sample contains synthetic transactions. Your saved data stays separate.',
  'The sample could not be read.': 'The sample could not be read.',
  'The sample could not load. Please try again.': 'The sample could not load. Please try again.',
  'The statement total exceeds safe integer money arithmetic.':
    'The statement total exceeds safe integer money arithmetic.',
  'These totals need a closer look.': 'These totals need a closer look.',
  'This CSV was read using Windows-1252 text encoding. Check names and descriptions in the review.':
    'This CSV was read using Windows-1252 text encoding. Check names and descriptions in the review.',
  'This PDF has no readable text. It may be a scan. Ask your provider for a text PDF or choose a CSV export.':
    'This PDF has no readable text. It may be a scan. Ask your provider for a text PDF or choose a CSV export.',
  'This PDF needs a password. Enter it to open the statement on this device.':
    'This PDF needs a password. Enter it to open the statement on this device.',
  'This browser could not save your data. Your data is available for this session only.':
    'This browser could not save your data. Your data is available for this session only.',
  'This device is out of storage. Your data is available for this session only.':
    'This device is out of storage. Your data is available for this session only.',
  'This file could not be read. Try a CSV export.':
    'This file could not be read. Try a CSV export.',
  'This file is empty. Choose another statement.': 'This file is empty. Choose another statement.',
  'This file is larger than 25 MB. Choose a shorter statement period.':
    'This file is larger than 25 MB. Choose a shorter statement period.',
  'This layout is new to us. Tell us which columns to use. Positive amounts are money in; negative amounts are money out.':
    'This layout is new to us. Tell us which columns to use. Positive amounts are money in; negative amounts are money out.',
  'This removes all transactions, category rules and settings from this browser. You can import a statement again later.':
    'This removes all transactions, category rules and settings from this browser. You can import a statement again later.',
  'This session is kept in memory. This browser could not confirm removal of any earlier saved copy. Close other MoMo Lens tabs and try deleting all data again.':
    'This session is kept in memory. This browser could not confirm removal of any earlier saved copy. Close other MoMo Lens tabs and try deleting all data again.',
  'This statement could not be read. Try a CSV export, or use a redacted statement to report a parser issue.':
    'This statement could not be read. Try a CSV export, or use a redacted statement to report a parser issue.',
  'This transaction has no counterparty to match.':
    'This transaction has no counterparty to match.',
  'Top category': 'Top category',
  'Top recipients': 'Top recipients',
  'Top senders': 'Top senders',
  Transaction: 'Transaction',
  'Transaction category': 'Transaction category',
  'Transaction category updated.': 'Transaction category updated.',
  'Transaction ledger': 'Transaction ledger',
  'Transaction was not completed.': 'Transaction was not completed.',
  Transactions: 'Transactions',
  'Transactions and totals from your imported statements.':
    'Transactions and totals from your imported statements.',
  'Transactions are sorted using simple rules. No AI. No connection to your mobile money account.':
    'Transactions are sorted using simple rules. No AI. No connection to your mobile money account.',
  Transfers: 'Transfers',
  'Transfers received': 'Transfers received',
  'Transfers sent': 'Transfers sent',
  'Try another name or clear your filters.': 'Try another name or clear your filters.',
  'Try fallback download': 'Try fallback download',
  'Try sample data': 'Try sample data',
  'Twi (draft)': 'Twi (draft)',
  'Twi translations are a draft and need native-speaker review. Missing translations use English.':
    'Twi translations are a draft and need native-speaker review. Missing translations use English.',
  Type: 'Type',
  UTC: 'UTC',
  'Understand your Ghana mobile money statement. No uploads, no accounts, no tracking. Everything stays on your device.':
    'Understand your Ghana mobile money statement. No uploads, no accounts, no tracking. Everything stays on your device.',
  'Understand your statement': 'Understand your statement',
  'Unknown counterparty': 'Unknown counterparty',
  'Unlock PDF': 'Unlock PDF',
  'Up to 25 MB': 'Up to 25 MB',
  'Up to five outgoing transactions, ranked by principal amount':
    'Up to five outgoing transactions, ranked by principal amount',
  'Up to ten recipients, ranked by transfer amount':
    'Up to ten recipients, ranked by transfer amount',
  'Up to ten senders, ranked by transfer amount': 'Up to ten senders, ranked by transfer amount',
  'View as table': 'View as table',
  'View chart': 'View chart',
  'View overview': 'View overview',
  'View skipped rows and reasons': 'View skipped rows and reasons',
  'We read your statement inside your browser. Your file, password and transactions never leave this device.':
    'We read your statement inside your browser. Your file, password and transactions never leave this device.',
  'What the app reads, where it keeps it and how to remove it.':
    'What the app reads, where it keeps it and how to remove it.',
  'Where do I find my statement?': 'Where do I find my statement?',
  'Wrapped period': 'Wrapped period',
  'Yes, delete everything': 'Yes, delete everything',
  'You choose a statement.': 'You choose a statement.',
  'You decide what stays.': 'You decide what stays.',
  'Your Wrapped PNG has been downloaded.': 'Your Wrapped PNG has been downloaded.',
  'Your Wrapped is ready to share.': 'Your Wrapped is ready to share.',
  'Your Wrapped is waiting.': 'Your Wrapped is waiting.',
  'Your browser could not clear saved data. Close other MoMo Lens tabs and try again.':
    'Your browser could not clear saved data. Close other MoMo Lens tabs and try again.',
  'Your browser reads the file on this device. We never receive it.':
    'Your browser reads the file on this device. We never receive it.',
  'Your device does the work.': 'Your device does the work.',
  'Your file is being read privately on this device.':
    'Your file is being read privately on this device.',
  'Your file never leaves your browser.': 'Your file never leaves your browser.',
  'Your money, at a glance.': 'Your money, at a glance.',
  'Your open session has been cleared. This browser could not confirm removal of any saved copy. Close other MoMo Lens tabs and try deleting again.':
    'Your open session has been cleared. This browser could not confirm removal of any saved copy. Close other MoMo Lens tabs and try deleting again.',
  'Your password only unlocks this file on your device.':
    'Your password only unlocks this file on your device.',
  'Your statement': 'Your statement',
  'Your statement never leaves your phone.': 'Your statement never leaves your phone.',
  'Your summary could not be created. Try the download again, or use your browser’s screenshot option.':
    'Your summary could not be created. Try the download again, or use your browser’s screenshot option.',
  'Your summary may show names or exact amounts. Check the preview before sharing.':
    'Your summary may show names or exact amounts. Check the preview before sharing.',
  'Your transactions will appear here after import. Your file is read locally and is never uploaded.':
    'Your transactions will appear here after import. Your file is read locally and is never uploaded.',
  'You’re in control.': 'You’re in control.',
  airtime: 'airtime',
  bill: 'bill',
  'came in and': 'came in and',
  'cash out': 'cash out',
  column: 'column',
  data: 'data',
  fee: 'fee',
  'fees & levies': 'fees & levies',
  interest: 'interest',
  'merchant payment': 'merchant payment',
  'momolens.': 'momolens.',
  'months, ': 'months, ',
  'of ': 'of ',
  'or choose a file from your phone or computer': 'or choose a file from your phone or computer',
  other: 'other',
  reversal: 'reversal',
  'rows read from ': 'rows read from ',
  'rows skipped.': 'rows skipped.',
  'to ': 'to ',
  transactions: 'transactions',
  transfer: 'transfer',
  'went out. Money out includes fees and levies.': 'went out. Money out includes fees and levies.',
  '{count} duplicate rows were removed.': '{count} duplicate rows were removed.',
  '{progress}% read': '{progress}% read',
  '{value1} transactions imported. Your statement stayed on this device.':
    '{value1} transactions imported. Your statement stayed on this device.',
  '{value1} · Money in': '{value1} · Money in',
  '{value1} · Money out': '{value1} · Money out',
  '{value1}% of largest category': '{value1}% of largest category',
  '·': '·',
  '· ': '· ',
  '+ {amount} fees & levies': '+ {amount} fees & levies',
  'Across {months} months, {incoming} came in and {outgoing} went out. Money out includes fees and levies.':
    'Across {months} months, {incoming} came in and {outgoing} went out. Money out includes fees and levies.',
  '{value1} transaction imported. Your statement stayed on this device.':
    '{value1} transaction imported. Your statement stayed on this device.',
  '{count} row read from {file}.': '{count} row read from {file}.',
  '{count} rows read from {file}.': '{count} rows read from {file}.',
  '{count} row skipped.': '{count} row skipped.',
  '{count} rows skipped.': '{count} rows skipped.',
  '{count} transaction added.': '{count} transaction added.',
  '{count} transactions added.': '{count} transactions added.',
  '{count} duplicate safely skipped.': '{count} duplicate safely skipped.',
  '{count} duplicates safely skipped.': '{count} duplicates safely skipped.',
  '{count} rows read from {file}. {skipped} rows skipped.':
    '{count} rows read from {file}. {skipped} rows skipped.',
  '{shown} of {total} transactions': '{shown} of {total} transactions',
  '{start} to {end} · {count} transactions': '{start} to {end} · {count} transactions',
} as const;
export default en;
export type TranslationKey = keyof typeof en;
