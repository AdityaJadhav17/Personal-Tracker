import { editedWhen } from '../domain/dates';
import type { SyncState } from '../state/useSync';

interface SyncStatusProps {
  state: SyncState;
  at: string | null;
  reason: string;
  syncNow: () => Promise<void>;
  now: Date;
}

/** US-101 (AC-101.5). The Sync line in Data: how the last round with the laptop went. */
export default function SyncStatus({
  state,
  at,
  reason,
  syncNow,
  now,
}: SyncStatusProps) {
  let text = 'Syncing…';
  if (state === 'synced' && at) text = `Synced ${editedWhen(at, now)}`;
  else if (state === 'unreachable') {
    text = 'Laptop not reachable; will sync when it is.';
  } else if (state === 'failed') text = `Sync failed: ${reason}`;

  return (
    <div className="data__tool">
      <button
        className="data__button"
        type="button"
        onClick={() => void syncNow()}
      >
        Sync now
      </button>
      <p className="data__what" role="status">
        {text}
      </p>
    </div>
  );
}
