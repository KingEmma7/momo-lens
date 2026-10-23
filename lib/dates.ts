const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// ASSUMPTION: numeric statement dates are day/month/year, and absent times mean midnight UTC+0.
/** Ghana uses UTC+0 year-round. Date-only values are midnight in Accra. */
export function parseDate(value: string): string {
  const trimmed = value.trim();
  let year = 0;
  let month = 0;
  let day = 0;
  let time = '';
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}:\d{2}(?::\d{2})?)(?:\.\d+)?Z?)?$/.exec(
    trimmed,
  );
  const numeric = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?$/.exec(
    trimmed,
  );
  const named = /^(\d{1,2})[- ]([a-z]{3})[- ](\d{4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?$/i.exec(
    trimmed,
  );
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
    time = iso[4] ?? '';
  } else if (numeric) {
    year = Number(numeric[3]);
    month = Number(numeric[2]);
    day = Number(numeric[1]);
    time = numeric[4] ?? '';
  } else if (named) {
    year = Number(named[3]);
    month = MONTHS.indexOf((named[2] ?? '').toLowerCase()) + 1;
    day = Number(named[1]);
    time = named[4] ?? '';
  } else throw new Error('Date is not recognised. Use day/month/year or ISO dates.');
  const [hours = '0', minutes = '0', seconds = '0'] = time.split(':');
  const date = new Date(
    Date.UTC(year, month - 1, day, Number(hours), Number(minutes), Number(seconds)),
  );
  if (
    year < 1900 ||
    year > 2200 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day ||
    Number(hours) > 23 ||
    Number(minutes) > 59 ||
    Number(seconds) > 59
  )
    throw new Error('Date is outside the valid calendar.');
  return date.toISOString();
}
export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-GH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Accra',
  }).format(new Date(value));
}
