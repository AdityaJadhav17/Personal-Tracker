# Spike: does Web Push actually work on the phone?

**Throwaway.** This directory answers three questions and is then deleted. It
is not part of the app, shares none of its code, and has its own dependency so
that nothing here can reach `package.json`. Do not build on it.

The questions, from [../../docs/product/v3-plan.md](../../docs/product/v3-plan.md):

1. **Does a push notification arrive on the iPhone at all?**
2. **Does it arrive when it was sent, or is it held for a Notification
   Summary?** This is the one that matters. A deadline nudge sent at 8am that
   surfaces at 6pm is worse than useless, because you will trust it.
3. **Is the subscription still alive a week later** without opening the app?

Web Push on iOS has required the site to be added to the Home Screen since
16.4, and native apps use the Time Sensitive interruption level to bypass Focus
modes and the Notification Summary. Whether a web push can do the same is the
thing this measures rather than assumes.

## Running it

```bash
cd spike/ios-push
npm install
npm start
```

That serves on `http://localhost:8080` and prints the VAPID public key it
generated. Service workers and push need a secure context, so the phone cannot
use a plain address on the local network. Put it behind Tailscale:

```bash
tailscale serve --bg --https=443 http://127.0.0.1:8080
```

Then open the `https://<machine>.<tailnet>.ts.net` address **on the iPhone**.

## On the phone

1. Open the address in Safari.
2. Share, then **Add to Home Screen**. Push will not work from the Safari tab,
   only from the installed app. The page says which one it is in.
3. Open it from the Home Screen icon.
4. Tap **Turn notifications on** and accept.
5. Lock the phone and leave it.

## The three measurements

**Question 1.** Tap **Send now**. A notification should appear within seconds.

**Question 2, the important one.** Every notification carries the second it was
sent, in its body. Compare that with when it actually appeared.

Run it three ways, locking the phone each time:

- **Send in 60 seconds** with the phone idle and no Focus on.
- **Send in 60 seconds** with a Focus mode on, the one you would use while in a
  lecture.
- **Send in 60 seconds** with Scheduled Summary turned on in Settings,
  Notifications, and this app included in it.

If the third arrives at the summary time rather than the sent time, phase one
of version 3 cannot use Web Push for time-critical nudges.

**Question 3.** Leave it a week without opening the app. Then tap **Send now**
from the laptop page. If the server reports the subscription is gone, iOS
expired it, and version 3 needs US-34, the story about knowing the nudges have
stopped, to cover re-subscription.

## Recording the answer

Write what happened into the version 3 plan under the spike, then delete this
directory. A spike that survives becomes a codebase nobody chose.

## Deliberately not here

No authentication. This binds to localhost and is reached over a tailnet, and
it holds one push subscription and nothing else. It never sees a deadline, a
title, or anything from the real database, which is why it can be this careless.
Do not put it on a public address.
