import assert from 'node:assert/strict';
import test from 'node:test';
import { rankLeaderboardEntries } from './scoring.ts';
import {
  canEditResults,
  highestSubmissionScore,
  resultEditAuditDetails,
  validateResultEdit,
} from './resultEdits.ts';

test('result editing authorization is admin-only', () => {
  assert.equal(canEditResults('admin'), true);
  assert.equal(canEditResults('student'), false);
  assert.equal(canEditResults(undefined), false);
});

test('manual result validation rejects out-of-range scores and missing reasons', () => {
  assert.deepEqual(validateResultEdit(84.256, 100, 'Verified by paper record'), {
    score: 84.26,
    reason: 'Verified by paper record',
  });
  assert.equal(validateResultEdit(-1, 100, 'Reason'), null);
  assert.equal(validateResultEdit(100.01, 100, 'Reason'), null);
  assert.equal(validateResultEdit(Number.NaN, 100, 'Reason'), null);
  assert.equal(validateResultEdit(70, 100, '  '), null);
});

test('audit payload records admin, participant, round, submission, old/new values, and reason', () => {
  assert.deepEqual(resultEditAuditDetails({
    adminIdentifier: 'admin-7',
    adminUsername: 'chief-admin',
    participantIdentifier: 'student-12',
    roundId: 'round_2',
    submissionId: 'submission-33',
    oldValue: 61.25,
    newValue: 86.5,
    reason: 'Reviewed rubric evidence',
  }), {
    adminIdentifier: 'admin-7',
    adminUsername: 'chief-admin',
    participantIdentifier: 'student-12',
    roundId: 'round_2',
    submissionId: 'submission-33',
    oldValue: 61.25,
    newValue: 86.5,
    reason: 'Reviewed rubric evidence',
  });
});

test('corrected best submission score is reflected in recalculated leaderboard ranking', () => {
  const scores = [{ score: 64 }, { score: 88.5 }];
  assert.equal(highestSubmissionScore(scores), 88.5);
  const ranked = rankLeaderboardEntries([
    {
      rank: 0,
      studentId: 'edited-student',
      studentName: 'Jordan',
      collegeName: 'College A',
      department: 'Computing',
      academicYear: '1st Year',
      totalScore: highestSubmissionScore(scores),
      round1Score: null,
      round2Score: 88.5,
      round3Score: null,
      round4Score: null,
      roundsCompleted: 1,
      totalTimeSeconds: 400,
      totalAttempts: 2,
      qualificationStatus: 'QUALIFIED',
      isTopThree: false,
    },
    {
      rank: 0,
      studentId: 'other-student',
      studentName: 'Casey',
      collegeName: 'College B',
      department: 'Computing',
      academicYear: '2nd Year',
      totalScore: 87,
      round1Score: null,
      round2Score: 87,
      round3Score: null,
      round4Score: null,
      roundsCompleted: 1,
      totalTimeSeconds: 300,
      totalAttempts: 1,
      qualificationStatus: 'QUALIFIED',
      isTopThree: false,
    },
  ]);
  assert.equal(ranked[0].studentId, 'edited-student');
  assert.equal(ranked[0].rank, 1);
});
