import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const read = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

test('AC-94.6 every action CI runs is pinned to a full commit id', () => {
  const uses = [...read('.github/workflows/ci.yml').matchAll(/uses:\s*(\S+)/g)];
  expect(uses.length).toBeGreaterThan(0);
  for (const [, action] of uses) {
    expect(action).toMatch(/^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/);
  }
});

test('AC-94.6 Dependabot proposes new pins for the actions every week', () => {
  const path = '.github/dependabot.yml';
  expect(existsSync(path)).toBe(true);
  const config = read(path);
  expect(config).toMatch(/package-ecosystem:\s*["']?github-actions/);
  expect(config).toMatch(/interval:\s*["']?weekly/);
});

test('AC-94.7 CI and the updater install without running install scripts', () => {
  expect(read('.github/workflows/ci.yml')).toMatch(
    /run: npm ci --ignore-scripts\n/,
  );
  expect(read('scripts/update.mjs')).toMatch(/npm\('ci --ignore-scripts /);
});

test('AC-102.9 Dependabot also watches the npm packages', () => {
  expect(read('.github/dependabot.yml')).toMatch(
    /package-ecosystem:\s*["']?npm/,
  );
});

test('AC-102.9 npm updates skip major versions and come as one grouped pull request', () => {
  const npm = read('.github/dependabot.yml').split(/package-ecosystem:/)[2];
  expect(npm).toMatch(/version-update:semver-major/);
  expect(npm).toMatch(/groups:/);
});

test('AC-102.9 CI runs once per change: on main and on pull requests', () => {
  expect(read('.github/workflows/ci.yml')).toMatch(
    /on:\n {2}push:\n {4}branches: \[main\]\n {2}pull_request:\n/,
  );
});

test('AC-102.9 every checkout in CI keeps no credentials', () => {
  const steps = read('.github/workflows/ci.yml').split(/^\s*- (?=uses:)/m);
  const checkouts = steps.filter((s) => /^uses:\s*actions\/checkout@/.test(s));
  expect(checkouts.length).toBeGreaterThan(0);
  for (const step of checkouts) {
    expect(step).toMatch(/persist-credentials:\s*false/);
  }
});
