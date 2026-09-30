export type SubmissionDateFilter = 'today' | 'all' | 'selected';

export interface SubmissionTimestamp {
  submittedAt: string;
}

const istDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function getIstDateKey(date: Date): string {
  const parts = istDateFormatter.formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`;
}

export function getIstDateRange(dateKey: string): { start: Date; end: Date } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) return null;

  const start = new Date(Date.UTC(year, month - 1, day) - 330 * 60 * 1000);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1) };
}

export function filterSubmissionsByIstDate<T extends SubmissionTimestamp>(
  submissions: T[],
  filter: SubmissionDateFilter,
  selectedDate: string,
  now = new Date()
): T[] {
  if (filter === 'all') return submissions;
  const dateKey = filter === 'today' ? getIstDateKey(now) : selectedDate;
  const range = getIstDateRange(dateKey);
  if (!range) return [];

  const start = range.start.getTime();
  const end = range.end.getTime();
  return submissions.filter((submission) => {
    const timestamp = Date.parse(submission.submittedAt);
    return Number.isFinite(timestamp) && timestamp >= start && timestamp <= end;
  });
}
