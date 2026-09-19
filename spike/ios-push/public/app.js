const state = document.getElementById('state');
const controls = document.getElementById('controls');
const logList = document.getElementById('log');

/**
 * iOS only allows push from a web app added to the Home Screen, never from a
 * Safari tab, so the first thing to report is which one this is.
 */
const installed =
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

function say(text) {
  state.textContent = text;
}

async function refreshLog() {
  const response = await fetch('/api/log');
  const { subscriptions, log } = await response.json();

  logList.innerHTML = '';
  if (log.length === 0) {
    logList.innerHTML = `<li>Nothing sent yet. ${subscriptions} device(s) subscribed.</li>`;
    return;
  }
  for (const entry of log) {
    const failed = entry.results.filter((r) => !r.ok);
    const item = document.createElement('li');
    const why = failed
      .map((f) => (f.gone ? 'subscription gone' : (f.error ?? 'failed')))
      .join('; ');
    item.textContent =
      `${entry.stamp} — ${entry.label} — ` +
      (failed.length ? `FAILED: ${why}` : 'accepted by the push service');
    logList.append(item);
  }
}

async function enable() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    say(`Permission was ${permission}. Nothing can be sent.`);
    return;
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const { publicKey } = await (await fetch('/api/vapid')).json();
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: publicKey,
  });

  await fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(subscription),
  });

  say('Subscribed. Lock the phone and send one of the delayed ones.');
  await refreshLog();
}

async function start() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    say('This browser has no push support at all.');
    return;
  }

  if (!installed) {
    say(
      'Running in a browser tab. On iOS, push only works once this is added to' +
        ' the Home Screen: Share, then Add to Home Screen, then open it from' +
        ' the icon. On a laptop you can carry on here.',
    );
  } else {
    say(`Installed. Notification permission is "${Notification.permission}".`);
  }

  controls.hidden = false;
  document.getElementById('enable').addEventListener('click', () => {
    void enable();
  });

  for (const button of document.querySelectorAll('[data-delay]')) {
    button.addEventListener('click', async () => {
      const delaySeconds = Number(button.dataset.delay);
      await fetch('/api/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ delaySeconds, label: button.dataset.label }),
      });
      say(
        delaySeconds > 0
          ? `Scheduled for ${delaySeconds}s. Lock the phone now.`
          : 'Sent.',
      );
      setTimeout(refreshLog, (delaySeconds + 2) * 1000);
      await refreshLog();
    });
  }

  await refreshLog();
}

void start();
