export type Priority = 'high' | 'normal' | 'low';
export type Category = 'academic' | 'personal';
export type ItemStatus = 'open' | 'done';

/** A thing with a date and a consequence. */
export interface Item {
  /** crypto.randomUUID(). Stable across export and import. */
  id: string;
  /** Non-empty after trimming. Rendered as text, never as HTML. */
  title: string;
  /**
   * UTC instant, e.g. "2026-10-04T06:59:00.000Z". The moment the deadline
   * falls, rendered in the device's current timezone.
   */
  dueAt: string;
  category: Category;
  priority: Priority;
  status: ItemStatus;
  /** Short memo. Empty string when absent, never null. */
  note: string;
  /** Instant, UTC. */
  createdAt: string;
  /** Instant, UTC. Null while status is "open". */
  completedAt: string | null;
}

/** Everything the app owns. This object is the export file. */
export interface Database {
  /** Bumped only when the shape changes in a way import must handle. */
  version: 1;
  items: Item[];
}

/** What the add form produces, before the app assigns identity and time. */
export interface ItemDraft {
  title: string;
  dueAt: string;
  category: Category;
  priority: Priority;
}
