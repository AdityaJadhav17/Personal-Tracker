import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { checksUrl, movesForward, verdict } from './update.mjs';

const SHA = 'a'.repeat(40);
const ACTIONS = { slug: 'github-actions' };

// Named as GitHub names the CI job's run (AC-83.5), posted by GitHub Actions
// for the commit being deployed (AC-94.4).
const run = (status, conclusion = null) => ({
  name: 'check',
  status,
  conclusion,
  head_sha: SHA,
  app: ACTIONS,
});

test('AC-56.2 a finished run that passed means deploy', () => {
  expect(verdict([run('completed', 'success')], SHA)).toBe('passed');
});

test('AC-56.2 a failed run means never deploy, even beside a passing one', () => {
  expect(
    verdict([run('completed', 'success'), run('completed', 'failure')], SHA),
  ).toBe('failed');
  expect(verdict([run('completed', 'cancelled')], SHA)).toBe('failed');
});

test('AC-56.3 a run still going, or none started yet, means wait', () => {
  expect(verdict([run('in_progress')], SHA)).toBe('pending');
  expect(verdict([run('queued')], SHA)).toBe('pending');
  expect(verdict([], SHA)).toBe('pending');
});

test('AC-56.3 a finished run beside one still going means wait, not deploy', () => {
  expect(verdict([run('completed', 'success'), run('in_progress')], SHA)).toBe(
    'pending',
  );
});

test('AC-56.2 skipped and neutral runs do not block a deploy', () => {
  expect(
    verdict(
      [
        run('completed', 'success'),
        run('completed', 'skipped'),
        run('completed', 'neutral'),
      ],
      SHA,
    ),
  ).toBe('passed');
});

test('AC-83.5 other checks passing is not enough until the CI run itself has', () => {
  const named = (name, status, conclusion = null) => ({
    name,
    status,
    conclusion,
    head_sha: SHA,
    app: ACTIONS,
  });
  expect(verdict([named('some-app', 'completed', 'success')], SHA)).toBe(
    'pending',
  );
  expect(
    verdict(
      [
        named('some-app', 'completed', 'success'),
        named('check', 'completed', 'success'),
      ],
      SHA,
    ),
  ).toBe('passed');
});

test('AC-94.4 a run named check that GitHub Actions did not post is not CI', () => {
  const other = { ...run('completed', 'success'), app: { slug: 'some-app' } };
  expect(verdict([other], SHA)).toBe('pending');
});

test('AC-94.4 runs for another commit count for nothing', () => {
  const elsewhere = { head_sha: 'b'.repeat(40) };
  expect(verdict([{ ...run('completed', 'success'), ...elsewhere }], SHA)).toBe(
    'pending',
  );
  expect(
    verdict(
      [
        run('completed', 'success'),
        { ...run('completed', 'failure'), ...elsewhere },
      ],
      SHA,
    ),
  ).toBe('passed');
});

test('AC-94.4 the updater asks for up to 100 runs for exactly this commit', () => {
  expect(checksUrl(SHA)).toBe(
    `https://api.github.com/repos/AdityaJadhav17/Personal-Tracker/commits/${SHA}/check-runs?per_page=100`,
  );
});

test('AC-94.5 a newer commit is a deploy; an older or unrelated one is not', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pt-ancestry-'));
  const git = (...args) =>
    execFileSync(
      'git',
      ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@t', ...args],
      { encoding: 'utf8', stdio: 'pipe' },
    ).trim();
  try {
    git('init', '--quiet');
    const commit = (name) => {
      writeFileSync(join(dir, name), name);
      git('add', name);
      git('commit', '--quiet', '-m', name);
      return git('rev-parse', 'HEAD');
    };
    const older = commit('a');
    const newer = commit('b');

    expect(movesForward(dir, '', newer)).toBe(true);
    expect(movesForward(dir, older, newer)).toBe(true);
    expect(movesForward(dir, newer, older)).toBe(false);
    expect(movesForward(dir, 'c'.repeat(40), newer)).toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
