import { expect, test } from 'vitest';
import { verdict } from './update.mjs';

// Named as GitHub names the CI job's run (AC-83.5).
const run = (status, conclusion = null) => ({
  name: 'check',
  status,
  conclusion,
});

test('AC-56.2 a finished run that passed means deploy', () => {
  expect(verdict([run('completed', 'success')])).toBe('passed');
});

test('AC-56.2 a failed run means never deploy, even beside a passing one', () => {
  expect(
    verdict([run('completed', 'success'), run('completed', 'failure')]),
  ).toBe('failed');
  expect(verdict([run('completed', 'cancelled')])).toBe('failed');
});

test('AC-56.3 a run still going, or none started yet, means wait', () => {
  expect(verdict([run('in_progress')])).toBe('pending');
  expect(verdict([run('queued')])).toBe('pending');
  expect(verdict([])).toBe('pending');
});

test('AC-56.3 a finished run beside one still going means wait, not deploy', () => {
  expect(verdict([run('completed', 'success'), run('in_progress')])).toBe(
    'pending',
  );
});

test('AC-56.2 skipped and neutral runs do not block a deploy', () => {
  expect(
    verdict([
      run('completed', 'success'),
      run('completed', 'skipped'),
      run('completed', 'neutral'),
    ]),
  ).toBe('passed');
});

test('AC-83.5 other checks passing is not enough until the CI run itself has', () => {
  const named = (name, status, conclusion = null) => ({
    name,
    status,
    conclusion,
  });
  expect(verdict([named('some-app', 'completed', 'success')])).toBe('pending');
  expect(
    verdict([
      named('some-app', 'completed', 'success'),
      named('check', 'completed', 'success'),
    ]),
  ).toBe('passed');
});
