import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import {
  checksUrl,
  confirmRestart,
  isNode,
  movesForward,
  serverChanged,
  stopServer,
  verdict,
} from './update.mjs';

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

test('US-100 task 0b the server restarts only when its own code changed', () => {
  expect(serverChanged(['src/App.tsx', 'scripts/serve.mjs'])).toBe(true);
  expect(serverChanged(['scripts/hub.mjs'])).toBe(true);
  expect(serverChanged(['src/App.tsx', 'scripts/update.mjs'])).toBe(false);
  expect(serverChanged([])).toBe(false);
});

test('US-100 task 0b only a node.exe line in tasklist counts as the server', () => {
  expect(isNode('"node.exe","4242","Console","1","40,000 K"\r\n')).toBe(true);
  expect(isNode('"chrome.exe","4242","Console","1","40,000 K"')).toBe(false);
  expect(isNode('INFO: No tasks are running which match the criteria.')).toBe(
    false,
  );
});

test('US-100 task 0b stopServer ends a node process in the pid file and says so otherwise', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pt-pid-'));
  const file = join(dir, 'server.pid');
  // A process table of one: alive until it is sent a signal that kills it.
  const world = () => {
    const sent = [];
    let alive = true;
    const signal = (pid, sig) => {
      if (!alive) throw Object.assign(new Error('gone'), { code: 'ESRCH' });
      if (sig === undefined) {
        sent.push(pid);
        alive = false;
      }
    };
    return { sent, signal };
  };
  try {
    writeFileSync(file, '4242\n');
    const live = world();
    expect(stopServer(file, () => true, live.signal)).toBe('stopped');
    expect(live.sent).toEqual([4242]);

    const other = world();
    expect(stopServer(file, () => false, other.signal)).toBe('stale');
    expect(other.sent).toEqual([]);

    const gone = world();
    gone.signal(4242); // already dead before the deploy
    expect(stopServer(file, () => true, gone.signal)).toBe('stale');

    expect(stopServer(join(dir, 'missing.pid'), () => true, live.signal)).toBe(
      'none',
    );
    writeFileSync(file, 'not a pid');
    expect(stopServer(file, () => true, live.signal)).toBe('none');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('US-100 final confirmRestart accepts a new live node pid and refuses anything else', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pt-pid-'));
  const file = join(dir, 'server.pid');
  const alive = () => {};
  const dead = () => {
    throw new Error('gone');
  };
  try {
    writeFileSync(file, '5000\n');
    expect(confirmRestart(file, 4242, () => true, alive, 2)).toBe(true);
    // No pid before the stop: any live pid counts.
    expect(confirmRestart(file, undefined, () => true, alive, 2)).toBe(true);

    // The old pid again, a dead new pid, or a pid that is not node: not back.
    expect(confirmRestart(file, 5000, () => true, alive, 2)).toBe(false);
    expect(confirmRestart(file, 4242, () => true, dead, 2)).toBe(false);
    expect(confirmRestart(file, 4242, () => false, alive, 2)).toBe(false);
    expect(
      confirmRestart(join(dir, 'missing.pid'), 4242, () => true, alive, 2),
    ).toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
