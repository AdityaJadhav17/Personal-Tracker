export type Priority = 'high' | 'normal' | 'low';
// US-76 added work. A new value, not a new field: stored data is unchanged.
export type Category = 'academic' | 'personal' | 'work';
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
  /** The goal this belongs to, or null. Added in version 2. */
  goalId: string | null;
  /** The course this belongs to, or null. Added in version 2. */
  courseId: string | null;
  /** How often it comes back. Added in version 3. */
  repeat: Repeat;
  /**
   * The day of the month a monthly series aims for, once it has had to clamp.
   * Null means the day `dueAt` falls on. Added in version 4, AC-40.6.
   */
  repeatDay: number | null;
  /**
   * The item this is a step of, or null for an ordinary item. One level only:
   * a step never has steps. Added in version 5, US-45.
   */
  parentId: string | null;
}

/** Something to get to by a date, that items belong to. */
export interface Goal {
  id: string;
  name: string;
  description: string;
  /** UTC instant. */
  targetAt: string;
  createdAt: string;
}

/** The details you would otherwise dig out of email every week. */
export interface Course {
  id: string;
  name: string;
  meetingLocation: string;
  professorEmail: string;
  officeHours: string;
  createdAt: string;
}

/** How one day went. One per day, keyed by local calendar day. */
export interface Reflection {
  id: string;
  /** Local calendar day, "2026-09-15". Unique across the collection. */
  day: string;
  /** 1 terrible through 5 great, matching the five faces in the reference. */
  score: 1 | 2 | 3 | 4 | 5;
  note: string;
  createdAt: string;
}

/**
 * US-80. A plain note. No title field: the first line is the title, as in
 * Apple Notes. Text only, never rendered as HTML.
 */
export interface Note {
  id: string;
  body: string;
  createdAt: string;
  /** UTC instant of the last edit. The list sorts and groups by it. */
  updatedAt: string;
  /** Kept at the top of the list. Added in version 7, US-81. */
  pinned: boolean;
  /**
   * The whole text, encrypted, when the note is locked; then `body` holds
   * only the title. Null for an ordinary note. Added in version 8, US-82.
   */
  sealed: Sealed | null;
}

/** US-82. AES-GCM output, base64: the IV it used and the ciphertext. */
export interface Sealed {
  iv: string;
  data: string;
}

/**
 * US-82. What checks a passcode. The salt makes its key; `check` is a known
 * value sealed under that key, so a wrong passcode is caught even when no
 * note is locked. The passcode itself is never stored.
 */
export interface Lock {
  salt: string;
  check: Sealed;
}

/**
 * US-88. One line of the daily routine. Done today when `doneOn` is today, so
 * the list starts fresh each morning with nothing to reset.
 */
export interface Task {
  id: string;
  /** May be empty while being typed, as a new line in Notion is. */
  title: string;
  /** The local day it was last ticked, "2026-09-15", or null. */
  doneOn: string | null;
  createdAt: string;
}

/** Everything the app owns. This object is the export file. */
export interface Database {
  /** Bumped when the shape changes in a way import has to handle. */
  version: 9;
  items: Item[];
  goals: Goal[];
  courses: Course[];
  reflections: Reflection[];
  /** Added in version 6, US-80. */
  notes: Note[];
  /** When the last export was taken, or null for never. Added in version 4. */
  lastBackupAt: string | null;
  /** US-82. Null until the first note is locked. Added in version 8. */
  lock: Lock | null;
  /** US-88. The routine, in the order shown. Added in version 9. */
  tasks: Task[];
}

/** What the goal form produces, before the app assigns identity and time. */
export interface GoalDraft {
  name: string;
  description: string;
  targetAt: string;
}

/** What the course form produces, before the app assigns identity and time. */
export interface CourseDraft {
  name: string;
  meetingLocation: string;
  professorEmail: string;
  officeHours: string;
}

/** What the add form produces, before the app assigns identity and time. */
export type Repeat = 'none' | 'weekly' | 'monthly';

export interface ItemDraft {
  title: string;
  dueAt: string;
  category: Category;
  priority: Priority;
  repeat: Repeat;
  /** AC-78.2. The course it is for, picked while adding; none if left out. */
  courseId?: string | null;
}
