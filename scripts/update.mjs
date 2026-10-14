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
// AC-102.8. Outside the folder the build empties, so a build that fails part
// way still leaves the record of what is deployed.
const marker = process.env.PT_MARKER ?? `${target}-deployed.txt`;
// Where the marker used to live; read once when the new file is not there yet.
const legacyMarker = join(target, 'deployed.txt');
// US-100. Written by serve.mjs, so a deploy can stop the node it started.
const pidFile = process.env.PT_PID ?? join(home, 'PersonalTracker-server.pid');

/**
 * What CI says about one commit: deploy it, never deploy it, or wait.
 * Anything not finished means wait; anything finished and not a pass means
 * never. AC-83.5: until the CI job's own run, named `check`, is among them,
 * wait, so another app's quick pass cannot deploy a commit CI never saw.
 * AC-94.4: only runs for this commit count, and `check` is CI only when GitHub
 * Actions posted it, so another app cannot stand in for it under that name.
 */
export function verdict(all, sha) {
  const runs = all.filter((run) => run.head_sha === sha);
  if (
    !runs.some(
      (run) => run.name === 'check' && run.app?.slug === 'github-actions',
    ) ||
    runs.some((run) => run.status !== 'completed')
  ) {
    return 'pending';
  }
  const fine = ['success', 'skipped', 'neutral'];
  return runs.every((run) => fine.includes(run.conclusion))
    ? 'passed'
    : 'failed';
}

/** AC-94.4. GitHub gives 30 runs a page unless asked; ask for the most. */
export function checksUrl(sha) {
  return `https://api.github.com/repos/${REPO}/commits/${sha}/check-runs?per_page=100`;
}

/**
 * AC-94.5. Whether `sha` is `deployed` or a later commit on top of it. A main
 * moved backwards, or onto history that never held the deployed commit, is
 * not deployed: whoever meant it runs `npm run deploy` by hand.
 */
export function movesForward(dir, deployed, sha) {
  if (deployed === '') return true;
  try {
    execFileSync(
      'git',
      ['-C', dir, 'merge-base', '--is-ancestor', deployed, sha],
      {
        stdio: 'pipe',
      },
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * AC-102.8. The commit last deployed, or '' for none. Only a full commit id
 * counts; anything else is logged and treated as absent.
 */
export function readMarker(file, legacy, say) {
  for (const path of [file, legacy]) {
    if (!existsSync(path)) continue;
    const text = readFileSync(path, 'utf8').trim();
    if (/^[0-9a-f]{40}$/.test(text)) return text;
    say('The deployed-commit marker is not a commit id; ignoring it.');
  }
  return '';
}

/** US-100. Whether a deploy changed the code the running server was started with. */
export function serverChanged(files) {
  return files.some(
    (f) => f === 'scripts/serve.mjs' || f === 'scripts/hub.mjs',
  );
}

/** US-100. Whether `tasklist /FO CSV /NH` output names a node process. */
export function isNode(output) {
  return /^"node\.exe"/im.test(output);
}

/** US-100. Whether `pid` is a node process, asked of Windows. */
function tasklistSaysNode(pid) {
  return isNode(
    execFileSync('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], {
      encoding: 'utf8',
      stdio: 'pipe',
    }),
  );
}

/** US-100. The pid in the server's pid file, or undefined. */
function readPid(file) {
  try {
    const pid = Number(readFileSync(file, 'utf8').trim());
    return Number.isInteger(pid) && pid > 0 ? pid : undefined;
  } catch {
    return undefined;
  }
}

/**
 * US-100. After /Run: whether the pid file now names a live node process other
 * than `before` (any, when there was none). Polls about `tries` x 100 ms, as the
 * task's IgnoreNew policy can drop a /Run and still exit 0.
 */
export function confirmRestart(
  file,
  before,
  isServer = tasklistSaysNode,
  signal = process.kill,
  tries = 100,
) {
  for (let i = 0; i < tries; i += 1) {
    const pid = readPid(file);
    try {
      if (pid !== undefined && pid !== before && isServer(pid)) {
        signal(pid, 0);
        return true;
      }
    } catch {
      // Not up yet.
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
  return false;
}

/**
 * US-100. Ends the node process named in the pid file and waits for it to go,
 * because the task's IgnoreNew policy drops a /Run while the old one lives.
 * Stop-ScheduledTask leaves node running, so this is how a deploy reaches the
 * server. Answers 'none' for a missing or garbled file, 'stale' when the pid
 * is not a node process (or already gone), 'stopped' once it is ended.
 */
export function stopServer(
  file,
  isServer = tasklistSaysNode,
  signal = process.kill,
) {
  let pid;
  try {
    pid = Number(readFileSync(file, 'utf8').trim());
  } catch {
    return 'none';
  }
  if (!Number.isInteger(pid) || pid <= 0) return 'none';
  try {
    if (!isServer(pid)) return 'stale';
    signal(pid);
  } catch {
    return 'stale';
  }
  for (let tries = 0; tries < 50; tries += 1) {
    try {
      signal(pid, 0);
    } catch {
      return 'stopped';
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
  throw new Error(`The server (pid ${pid}) did not stop.`);
}

async function checks(sha) {
  const response = await fetch(checksUrl(sha), {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'personal-tracker-updater',
    },
  });
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
  const deployed = readMarker(marker, legacyMarker, say);
  if (sha === deployed) return say(`Up to date at ${short}.`);
  if (!movesForward(src, deployed, sha)) {
    return say(`main moved back to ${short}; not deploying an older commit.`);
  }

  // AC-56.3. While CI is running, look again every minute rather than leaving
  // it to the next run, so a push lands about as soon as CI goes green.
  for (let waited = 0; ; waited += 1) {
    const state = verdict(await checks(sha), sha);
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
  // AC-94.7. No dependency's install script runs on this laptop.
  npm('ci --ignore-scripts --no-audit --no-fund');
  npm(`run build -- --outDir "${target}" --emptyOutDir`);
  // AC-56.5. Recorded only once the deploy checks out whole.
  execFileSync(process.execPath, ['scripts/check-deploy.mjs', target], {
    cwd: src,
    stdio: 'pipe',
  });
  // US-100. Before the marker, so a failed restart is retried next run.
  let restarted = false;
  if (
    deployed === '' ||
    serverChanged(git('diff', '--name-only', deployed, sha).split('\n'))
  ) {
    const before = readPid(pidFile);
    const stopped = stopServer(pidFile);
    // A stale pid means the server is already down: start it all the same.
    if (stopped === 'none') {
      say('No server pid; restart the server by hand (README).');
    } else {
      execFileSync('schtasks', ['/Run', '/TN', 'Personal Tracker server'], {
        stdio: 'pipe',
      });
      if (!confirmRestart(pidFile, before)) {
        throw new Error(
          'The server did not come back; restart it by hand (README).',
        );
      }
      restarted = true;
    }
  }
  writeFileSync(marker, `${sha}\n`);
  say(`Deployed ${short}: ${git('log', '-1', '--format=%s', sha)}`);
  if (restarted) say('Restarted the server.');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    const detail = String(error.stderr ?? '').trim() || error.message;
    say(`Failed: ${detail.split('\n')[0]}`);
    process.exitCode = 1;
  });
}
