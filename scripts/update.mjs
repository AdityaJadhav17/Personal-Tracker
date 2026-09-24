/**
 * US-56. Deploy main to the app on this laptop once CI has passed, so a push
 * is the last thing Aditya does and the app follows on its own.
 *
 * A scheduled task runs this every five minutes. It works in its own clone,
 * never the working folder, so a half-finished branch or an uncommitted edit
 * cannot reach the app. It reads only public information from GitHub: no
 * token on the laptop and nothing listening for a connection.
 */
import { execFileSync } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO = 'AdityaJadhav17/Personal-Tracker';

// AC-56.3. CI takes about three minutes. Past twenty something is stuck, and
// the next run five minutes later picks it up again.
const WAIT_MINUTES = 20;

const home = process.env.LOCALAPPDATA ?? '';
// Overridable so this is tested against scratch folders, never the real app.
const src = process.env.PT_SRC ?? join(home, 'PersonalTracker-src');
const target = process.env.PT_TARGET ?? join(home, 'PersonalTracker');
const log = process.env.PT_LOG ?? join(home, 'PersonalTracker-update.log');
// Inside the deployed folder on purpose: the build empties it first, so a
// deploy that fails part way leaves no marker and the next run tries again.
const marker = join(target, 'deployed.txt');

/**
 * What CI says about one commit: deploy it, never deploy it, or wait.
 * Anything not finished means wait; anything finished and not a pass means
 * never.
 */
export function verdict(runs) {
  if (runs.length === 0 || runs.some((run) => run.status !== 'completed')) {
    return 'pending';
  }
  const fine = ['success', 'skipped', 'neutral'];
  return runs.every((run) => fine.includes(run.conclusion))
    ? 'passed'
    : 'failed';
}

async function checks(sha) {
  const response = await fetch(
    `https://api.github.com/repos/${REPO}/commits/${sha}/check-runs`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'personal-tracker-updater',
      },
    },
  );
  if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
  return (await response.json()).check_runs;
}

function git(...args) {
  return execFileSync('git', ['-C', src, ...args], {
    encoding: 'utf8',
    stdio: 'pipe',
  }).trim();
}

/** npm is a .cmd on Windows, which Node only runs through a shell. */
function npm(command) {
  execFileSync(`npm ${command}`, { cwd: src, stdio: 'pipe', shell: true });
}

/** One line per change of state; the same message twice in a row is kept once. */
function say(message) {
  console.log(message);
  const last = existsSync(log)
    ? (readFileSync(log, 'utf8').trimEnd().split('\n').at(-1) ?? '')
    : '';
  if (!last.endsWith(message)) {
    appendFileSync(log, `${new Date().toISOString()}  ${message}\n`);
  }
}

async function main() {
  if (!existsSync(join(src, '.git'))) {
    execFileSync(
      'git',
      ['clone', '--quiet', `https://github.com/${REPO}.git`, src],
      { stdio: 'pipe' },
    );
  }
  git('fetch', '--quiet', 'origin', 'main');
  const sha = git('rev-parse', 'origin/main');
  const short = sha.slice(0, 7);

  // AC-56.6.
  const deployed = existsSync(marker)
    ? readFileSync(marker, 'utf8').trim()
    : '';
  if (sha === deployed) return say(`Up to date at ${short}.`);

  // AC-56.3. While CI is running, look again every minute rather than leaving
  // it to the next run, so a push lands about as soon as CI goes green.
  for (let waited = 0; ; waited += 1) {
    const state = verdict(await checks(sha));
    if (state === 'passed') break;
    // AC-56.2.
    if (state === 'failed')
      return say(`CI failed for ${short}; not deploying it.`);
    if (waited === WAIT_MINUTES) {
      return say(`CI still running for ${short}; trying again next run.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 60_000));
  }

  // AC-56.4. Exactly the commit CI passed, whatever this clone held before.
  git('checkout', '--quiet', '--force', '--detach', sha);
  npm('ci --no-audit --no-fund');
  npm(`run build -- --outDir "${target}" --emptyOutDir`);
  // AC-56.5. Recorded only once the deploy checks out whole.
  execFileSync(process.execPath, ['scripts/check-deploy.mjs', target], {
    cwd: src,
    stdio: 'pipe',
  });
  writeFileSync(marker, `${sha}\n`);
  say(`Deployed ${short}: ${git('log', '-1', '--format=%s', sha)}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    const detail = String(error.stderr ?? '').trim() || error.message;
    say(`Failed: ${detail.split('\n')[0]}`);
    process.exitCode = 1;
  });
}
