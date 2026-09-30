import assert from 'node:assert/strict';
import test from 'node:test';
import { filterSubmissionsByIstDate, getIstDateRange } from './istDateFilter.ts';

const rows = [
  { id: 'previous', submittedAt: '2026-09-28T18:29:59.999Z' },
  { id: 'first-today', submittedAt: '2026-09-28T18:30:00.000Z' },
  { id: 'last-today', submittedAt: '2026-09-29T18:29:59.999Z' },
  { id: 'next-day', submittedAt: '2026-09-29T18:30:00.000Z' },
];

test('IST day bounds include 00:00 through 23:59:59.999 without UTC date drift', () => {
  const range = getIstDateRange('2026-09-29');
  assert.ok(range);
  assert.equal(range.start.toISOString(), '2026-09-28T18:30:00.000Z');
  assert.equal(range.end.toISOString(), '2026-09-29T18:29:59.999Z');
  assert.deepEqual(filterSubmissionsByIstDate(rows, 'selected', '2026-09-29').map((row) => row.id), ['first-today', 'last-today']);
});

test('Today is based on IST date and excludes previous-day submissions', () => {
  const now = new Date('2026-01-01T00:15:00.000Z');
  const samples = [
    { id: 'previous-ist-day', submittedAt: '2025-12-31T18:29:59.999Z' },
    { id: 'today-ist-day', submittedAt: '2025-12-31T18:30:00.000Z' },
  ];
  assert.deepEqual(filterSubmissionsByIstDate(samples, 'today', '', now).map((row) => row.id), ['today-ist-day']);
});

test('All Dates preserves historical submissions and invalid selected dates show no rows', () => {
  assert.equal(filterSubmissionsByIstDate(rows, 'all', '').length, rows.length);
  assert.deepEqual(filterSubmissionsByIstDate(rows, 'selected', '2026-02-30'), []);
});
