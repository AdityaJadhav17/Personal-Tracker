# Version 3: the nudge that reaches you

Proposed 19 September 2026. Nothing here is approved and nothing is built.

Version 3 does one thing version 1 and 2 deliberately could not: reach you when
the app is closed. Aditya asked for notifications on his phone first and
logging from his phone later, and that order is the plan's spine, because the
first half is a one-way read and the second half is a second writer. Those are
very different problems and mixing them is how this gets expensive.

## This finishes an argument from Phase 0

[user-research.md](user-research.md) opened with Decision 1, "how a nudge
reaches you", and said plainly that a v1 honouring every non-goal "does not
solve the problem that made you build it." It listed three ways out and
recommended the cheapest now and the calendar export next. Both shipped: the
dashboard as US-02 and US-12, the `.ics` export as US-24.

So version 3 is not a new idea. It is the third option from that page, taken
after the first two were built and found to leave a gap.

## What the calendar export does not fix

The `.ics` file is a snapshot. Two consequences, and they are the whole reason
this document exists.

**It goes stale the moment you add anything.** Export on Sunday, add three
deadlines on Tuesday, and your phone knows about none of them until you export
and import again. You will not do that every time, which means the reminder
system silently drifts out of date while continuing to look like it works.

**A calendar alarm knows about one item at a time.** It can say "midterm in one
hour". It cannot say "four things are due this week and you have finished
nothing in three days", because your calendar does not hold your completions or
your reflections. This app does. That sentence is the only thing version 3 can
say that a calendar cannot, and it is the strongest argument for building it.

## The decision this overturns

`CLAUDE.md` says: "No accounts, no server, no data leaving the machine." The
Not built section says push notifications cannot be built because they need a
server, a subscription endpoint and a network request, "and the security
posture forbids all three."

Version 3 overturns that. It is Aditya's posture and his to overturn, but it
needs an entry in [../engineering/decisions.md](../engineering/decisions.md)
naming what changes, not a quiet arrival with a Dockerfile.

**What actually changes.** A doctor's appointment title and a rent date stop
living only on a BitLocker-encrypted laptop. Encryption at rest on a server is
close to theatre, because the server needs the key to read the data in order to
decide whether to nudge you about it.

**What does not have to change.** The server does not have to be on the public
internet. See the Tailscale decision below.

**One thing people miss.** Web Push does not reach a phone directly. It is
relayed by Google's or Apple's push service. The payload is encrypted
end-to-end by the Web Push spec, so the relay sees that a message arrived and
not what it said, but "no third party is involved" stops being true and should
be written down rather than discovered later.

## Personas

Same person, two situations. Version 3 exists because the second one has no
tool.

### At the desk: Aditya planning

Unchanged from [user-research.md](user-research.md). Laptop open, a real
keyboard, sitting down deliberately. This is where a term gets set up, where a
paste of fifty deadlines happens, and where the dashboard gets read properly.
Version 2 serves this person well and version 3 must not make his experience
worse.

**What he needs from v3.** Nothing new. He needs it not to break.

### Between classes: Aditya with only a phone

**Where he is.** Walking across campus, in a lecture that just ended, in a
queue. Three to five minutes, one hand, no keyboard.

**What just happened.** A professor said in lecture that the project proposal
is due Friday instead of Monday. That is the moment the deadline exists, and it
is forty minutes before he is anywhere near the laptop. Today it goes into his
memory, which is the system that already failed him twice.

**What he needs.** To be told about things without opening anything, and later,
to record one thing in under fifteen seconds without typing a date.

**What he will not do.** Fill in a five-field form on a phone keyboard while
walking. Any phase 2 design that assumes he will is wrong.

**Failure in one sentence.** He gets a notification, has no way to act on it
where he is standing, and by the time he has a laptop the thing has been
forgotten again.

## Phase one: the nudge reaches the phone

One-way. The laptop is still where data lives and still the only thing that
writes. The server reads a copy and sends notifications. Nothing here requires
answering who owns the data, which is what keeps it small.

```
US-30  As someone who owns the box this runs on,
       I want to pair my phone with my server once,
       so that only my devices can reach my deadlines.

Priority: Must
Acceptance criteria:
  AC-30.1  Given the server is running,
           when I pair a device with a one-time code,
           then that device receives a token of its own with an expiry.
  AC-30.2  Given a request with no token or an expired one,
           when it reaches any endpoint,
           then it is refused, and the refusal does not say which part was
           wrong.
  AC-30.3  Given a paired device,
           when I revoke it from another device,
           then its token stops working immediately.
  AC-30.4  Given a pairing code,
           when it has been used once or fifteen minutes have passed,
           then it no longer works.
```

```
US-31  As someone whose laptop holds the real database,
       I want it to mirror itself to the server when it changes,
       so that the server knows what is due without me doing anything.

Priority: Must
Acceptance criteria:
  AC-31.1  Given the app is open and something changes,
           when the change is saved locally,
           then the server receives the new database.
  AC-31.2  Given the server is unreachable,
           when a change is saved,
           then the change still happens locally and the app says the mirror is
           behind rather than failing the edit.
  AC-31.3  Given the laptop has been closed for a day,
           when it opens and reconnects,
           then the server catches up without me pressing anything.
  AC-31.4  Given the server has a copy,
           when I look at what it stores,
           then it holds only what a nudge needs.
```

```
US-32  As someone who forgets things that are not in front of him,
       I want a notification before a deadline,
       so that I find out while I can still act.

Priority: Must
Acceptance criteria:
  AC-32.1  Given an open item due tomorrow,
           when the nudge window is reached,
           then my phone shows a notification naming the item and when it is
           due.
  AC-32.2  Given an item I have already finished,
           when its nudge window is reached,
           then nothing is sent.
  AC-32.3  Given an item I have been nudged about,
           when the scheduler runs again,
           then I am not nudged about the same thing twice.
  AC-32.4  Given the server was down when a nudge was due,
           when it comes back,
           then a nudge whose moment has passed is dropped rather than arriving
           late and wrong.
```

```
US-33  As someone whose calendar cannot see the whole picture,
       I want one morning summary that knows what I have actually done,
       so that I get the sentence a calendar alarm cannot give me.

Priority: Should
Acceptance criteria:
  AC-33.1  Given deadlines this week and completions behind them,
           when the morning summary is sent,
           then it says how many are due and how many days since I finished
           anything.
  AC-33.2  Given nothing is due and nothing is overdue,
           when the morning summary would be sent,
           then it is not sent at all.
  AC-33.3  Given I am in a different timezone,
           when the summary is sent,
           then it arrives in my morning, not the server's.
```

```
US-34  As someone who does not trust a reminder system he cannot see working,
       I want to know when the nudges have stopped,
       so that silence never means "nothing is due" when it means "it is
       broken".

Priority: Must
Acceptance criteria:
  AC-34.1  Given the laptop has not mirrored for longer than a day,
           when I open the app,
           then it says so.
  AC-34.2  Given the server has not sent anything for longer than expected,
           when I look at the app,
           then I can see when the last nudge went out.
  AC-34.3  Given push delivery has been refused by the browser,
           when I open the app,
           then it tells me notifications are off rather than failing quietly.
```

**US-34 is the one that makes the rest trustworthy.** A reminder system that
fails silently is worse than no reminder system, because you stop checking
manually and then it stops working. This is the story that would be cut for
time and should not be.

## Phase two: logging from the phone

Only after phase one has run for a fortnight. This is where a second writer
arrives and the data ownership question has to be answered.

```
US-35  As someone standing in a corridor,
       I want to see what is due on my phone,
       so that the notification I just got leads somewhere.

Priority: Must
Acceptance criteria:
  AC-35.1  Given I open the app on my phone,
           when it loads,
           then I see the same groups the laptop shows.
  AC-35.2  Given I have no signal,
           when I open it,
           then I see the last state it knew rather than an error.
```

```
US-36  As someone told about a deadline in a lecture,
       I want to record it in under fifteen seconds on a phone,
       so that it never has to survive in my memory until I reach a laptop.

Priority: Must
Acceptance criteria:
  AC-36.1  Given the phone app is open,
           when I add an item,
           then it takes a title and a date and nothing else is required.
  AC-36.2  Given I am picking a date on a phone,
           when I set it,
           then today, tomorrow and this Friday are one tap each.
  AC-36.3  Given I add something with no signal,
           when signal returns,
           then it arrives on the server without me doing anything.
```

```
US-37  As someone with two devices,
       I want one truth,
       so that finishing something on my phone is finished on my laptop.

Priority: Must
Acceptance criteria:
  AC-37.1  Given I mark something done on my phone,
           when I open the laptop,
           then it is done there too.
  AC-37.2  Given I edit the same item on both devices while offline,
           when both reconnect,
           then the later edit wins and the earlier one is not silently lost:
           I am told it was overwritten.
  AC-37.3  Given a device has been offline for a week,
           when it reconnects,
           then it converges without me choosing between two databases.
```

**AC-37.2 is the hard one and the one to design first.** Everything else in
phase two is ordinary work.

## Tech stack, and why each piece

**Node with the existing domain layer, reused verbatim.** `src/domain/` is pure
TypeScript with no DOM and no storage, and every function already takes `now`
as a parameter. `groupOf`, `isUpcoming` and `nextOccurrence` decide what is due
and when the next one falls, and they will run on the server unchanged. That
property was built for testability and it pays for itself here: the server and
the client cannot disagree about what "due tomorrow" means, because they run the
same function. Any other language throws that away and duplicates the rules.

**SQLite, not Postgres.** One user, a database measured in kilobytes. SQLite is
a file in a volume, so a backup is a copy and there is no second container.
Parameterised queries throughout, which is section 9 of the audit rules and is
not optional from the first line.

**Tailscale, so the server is never on the public internet.** This is the
recommendation I feel strongest about. The phone and the laptop join a tailnet,
the server listens only there, and there is no inbound port, no public
hostname, no certificate renewal, and no bot traffic. Push still works, because
notifications flow outward from the server to the push service, not inward.
It removes most of section 9's attack surface by removing the attacker's route
rather than by defending it.

The alternative is Caddy with Let's Encrypt on a public host, which is the
normal answer and strictly more exposed for no gain here.

**A PWA, not a second notification app.** Phase 2 needs a phone interface
regardless, so the app itself becomes the phone app: installed to the home
screen, served by the same server, using Web Push. The alternative is a
self-hosted notification relay such as ntfy, which would work for phase 1 in an
afternoon and then be thrown away when phase 2 arrives. Building something to
discard it is only worth it if phase 1 has to ship this week, and it does not.

**The phone is an iPhone 18 Pro Max**, which settles this in favour of the PWA.
The Home Screen install has been required for Web Push since iOS 16.4, and it
is a step phase two would need anyway, so it costs one install rather than two.
A notification relay would mean an App Store app now and the PWA later.

Three iOS specifics change the risk, and the first could sink phase one. They
are measured by the spike below rather than assumed.

**Notification Summary and Focus.** iOS can hold non-urgent notifications for a
scheduled digest. Native apps escape that with the Time Sensitive interruption
level, and the Web Push API is not believed to expose it. A nudge sent at 8am
that surfaces at 6pm is worse than none, because you will have trusted it.

**No background sync.** A PWA on iOS cannot refresh itself in the background.
Push is the only way to reach the phone proactively, which is fine for phase
one and means phase two updates on open or on push, never quietly.

**Seven day storage eviction.** Safari evicts script-writable storage after
seven days without interaction. Home Screen web apps are exempt, but it is a
strong argument for the server owning the data in phase two rather than the
phone holding anything that matters.

## The spike, and the go/no-go it decides

Written and ready in [../../spike/ios-push](../../spike/ios-push). It is a
minimal PWA and a server that sends a notification carrying the second it was
sent, so that the arrival time can be compared with it. It shares no code with
the app and has its own dependency.

**Run it before approving any of this.** Roughly two hours including the
waiting.

**Question 1: does a push arrive at all?** Send one and watch.

**Question 2: does it arrive when sent?** The one that matters. Send with the
phone idle, again with a Focus mode on, and again with the app in a Scheduled
Summary.

**Question 3: is the subscription alive a week later?** Leave it a week, then
send. A `404` or `410` means iOS expired it.

**Go.** All three pass, and the plan stands as written.

**No-go on question 2.** Phase one cannot use Web Push for time-critical
nudges. The fallback is not obvious and would need its own thinking: an ICS
feed the phone subscribes to, where the calendar rather than a web app owns the
alert, is the most likely answer, and it changes phase one substantially while
leaving phase two alone.

**No-go on question 3.** Survivable. It makes US-34 load-bearing rather than
merely prudent: the app has to notice the subscription has lapsed and ask to
re-subscribe.

Record the answers here and then delete the spike directory. A spike that
survives becomes a codebase nobody chose.

**A scheduler inside the server process, not cron.** The nudge logic needs the
database and the domain functions. A loop that wakes every few minutes, asks
which items crossed a threshold since the last pass, and records what it sent
is less machinery than a cron container and makes AC-32.3 trivial, because "what
did I already send" is a table.

**Docker Compose with two services at most**: the app and Tailscale. Adding a
third is a decision that needs a reason.

## Where the server runs, which is not the same question as HTTPS

Two things get conflated here and they have different answers.

**Does it need HTTPS?** Yes, for the phone, and there is no way around it.
Service workers and the Push API only run in a secure context. Browsers exempt
`http://localhost` and `127.0.0.1`, which is why the spike works on the laptop
over plain HTTP, but that exemption does not extend to a LAN address. From the
phone, `http://192.168.1.50:8080` is not a secure context, the service worker
will not register, and push is impossible.

**Does it need to be on the internet?** No. `tailscale serve` provisions a real
Let's Encrypt certificate for a `*.ts.net` name and carries traffic over the
WireGuard tunnel between your own devices. No port forwarding, no inbound rule,
nothing listening on a public address.

Two things to know. `tailscale funnel` is the opposite of `serve` and publishes
to the internet; it is not part of this plan. And the hostname appears in
Certificate Transparency logs, which are public, so the existence of
`machine.your-tailnet.ts.net` becomes a matter of record. That is metadata
rather than access, and it should be known rather than discovered.

**Outbound is still needed.** A push does not travel from the server to the
phone. The server hands it to Apple's push service, which delivers it. Zero
inbound connections, but it must be able to reach out. The payload is encrypted
with keys only the server and the phone hold, so Apple relays ciphertext while
seeing that a message went to that device and when.

### The problem this plan originally skipped

**A server on a laptop cannot wake you up.** The lid is shut at 8am, so the
scheduler is not running, so no nudge arrives, which is the whole point of phase
one. "Local to my device" and "reminds me when I am not at my device" pull
against each other, and the first draft of this plan did not say so.

### Option A: a spare always-on machine at home

A Raspberry Pi, an old laptop, a NAS. On the tailnet, nothing public, and the
data never leaves the flat.

**Costs.** Sixty to eighty pounds of hardware and an evening of setup. A Pi
running continuously from an SD card will corrupt it eventually, so boot from
a USB SSD or accept that the SQLite file needs backing up somewhere. A home
internet outage means no nudges, and so does going home for a holiday and
leaving it behind.

**The question that decides whether this is viable:** is there a stable
always-on place to put it? A flat with its own router, yes. A dorm room with
managed networking and a move every September, much less clearly.

### Option B: a small VPS

Four to six pounds a month. Always on, survives moving, snapshots are easy, and
somebody else worries about the power.

**Costs.** A doctor's appointment title and a rent date land on a disk owned by
a company. Encryption at rest there is close to theatre, because the server
needs the key in order to decide whether to nudge you about the thing. This is
the option that most directly contradicts what the security posture was written
to protect, and it should not be chosen for convenience alone.

### Option C: the laptop, accepting the limit

Free, no new hardware, no new trust boundary at all beyond the push relay. It
nudges while you are working and not otherwise.

**Costs.** It would have caught an assignment deadline during an evening study
session. It would not have caught a 9am dentist appointment, which is one of
the two failures that caused this project to exist.

### The evaluation

**Start with C, move to A when there is evidence, and take B only if there is
nowhere stable to put A.**

The reasoning has three parts.

**The host is a deployment decision, not an architectural one.** The server is a
container with a volume. Moving it from a laptop to a Pi is the same compose
file somewhere else, plus re-pairing the phone. Choosing C now costs nothing
later, which is what makes starting cheap safe rather than short-sighted.

**C's gap is already half covered.** The time-critical alarm case, the 9am
appointment, is what the `.ics` export exists for, and your phone fires that
alarm whether or not any server is awake. What the server adds that nothing else
can is the sentence about completions from US-33, and a morning digest arriving
at 8:20 instead of 8:00 is not a failure. So C is weaker than A, but not as much
weaker as it first looks.

**A is right, but not yet.** Sixty pounds and an evening is a small price for
keeping the data in the flat, and it is clearly better than B on every axis
except portability. But buying it before the spike has answered whether iOS
delivers a push on time, and before a fortnight has shown the nudges are worth
having, is buying hardware to support a guess.

**Against B, specifically.** It is the only option that moves personal health
and location data onto someone else's disk, and it buys uptime that A also
provides. Its one genuine case is having nowhere stable to put a Pi, which is a
real possibility worth answering before the hardware is bought rather than
after.

**For the spike, the laptop is correct.** It measures whether iOS delivers a
push on time, which does not depend on where the sender lives. Do not buy
anything to answer that question.

## What the server is allowed to hold

Written before any code, because it is easier to keep a promise than to shrink
a database later.

- Items, goals, courses and reflections: yes. The nudge logic needs them.
- Device tokens and push subscriptions: yes, with expiry.
- A record of what was sent and when: yes. AC-32.3 depends on it.
- Logs containing item titles: **no.** A log line naming a doctor's appointment
  is the same disclosure as the database with none of the care.
- Anything that leaves the tailnet beyond the encrypted push payload: **no.**

## How this could be wrong

**The calendar export might already be enough.** It has not been through a
single school day. If a week of classes shows the `.ics` alarms working, phase
one is a lot of machinery for a marginal gain, and the honest thing is to not
build it. This plan should be re-read after that week, not before.

**The nudge might become noise.** A notification you swipe away without reading
is worse than nothing, because it trains you to ignore the channel. AC-33.2
exists for that reason. If the first fortnight produces more swipes than
actions, the answer is fewer nudges, not better copy.

**Phase two might not be needed.** If phase one plus the existing paste box
covers it, the phone stays a screen you read rather than one you write to,
which is a smaller and better product.

## What happens before any of this

Three real school days with the current app and the `.ics` on the phone. That
is the last unticked line on the version 2 checklist, and it is also the only
thing that can tell us whether phase one is solving a real problem or a
predicted one.

## Canvas, mentioned and not planned

UCSD runs Canvas, Canvas publishes a per-user calendar feed, and every
coursework deadline typed into this app is a transcription of something a
machine already knows. Pulling from it would remove the entry cost that US-26
only softened.

It is not in this plan because it needs a Canvas token, which brings section 4
of the audit rules into play, and because it is a bigger idea than notifications
and would swallow them. It is the strongest candidate for version 4 and worth
knowing about while designing version 3, so that the server is not built in a
way that makes it hard.
