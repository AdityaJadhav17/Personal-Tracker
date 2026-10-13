import { editedWhen } from '../domain/dates';
import type { BackupState } from '../state/useAutoBackup';

interface BackupFolderProps {
  supported: boolean;
  folder: string | null;
  state: BackupState;
  reason: string;
  lastAt: string | null;
  choose: () => Promise<void>;
  allow: () => Promise<void>;
  now: Date;
}

/**
 * US-95. The automatic backup, in Data beside Export: which folder, when it
 * last wrote, and, when the browser stops it, why and the one thing to do.
 */
export default function BackupFolder({
  supported,
  folder,
  state,
  reason,
  lastAt,
  choose,
  allow,
  now,
}: BackupFolderProps) {
  // AC-95.6. Safari, and so the iPhone, cannot write into a folder.
  if (!supported) return null;

  if (state === 'paused') {
    return (
      <div className="data__tool">
        <button
          className="prompt__button"
          type="button"
          onClick={() => void allow()}
        >
          Allow backups again
        </button>
        <p className="data__what" role="status">
          Backups to {folder} are paused. {reason}
        </p>
      </div>
    );
  }

  return (
    <div className="data__tool">
      <button
        className="data__button"
        type="button"
        onClick={() => void choose()}
      >
        {state === 'on' ? 'Change folder' : 'Choose backup folder'}
      </button>
      <p className="data__what">
        {state === 'on' ? (
          <>
            Backing up to {folder} every day, by itself.
            {lastAt && ` Last copy ${editedWhen(lastAt, now)}.`}
          </>
        ) : (
          // AC-95.1. Documents and Desktop are inside OneDrive on this
          // laptop, and a folder there goes to the internet.
          'A copy of everything, every day, by itself, in a folder on this laptop. Pick one outside OneDrive; Documents and Desktop are inside it.'
        )}
      </p>
    </div>
  );
}
