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

/** Everything the app owns. This object is the export file. */
export interface Database {
  /** Bumped when the shape changes in a way import has to handle. */
  version: 5;
  items: Item[];
  goals: Goal[];
  courses: Course[];
  reflections: Reflection[];
  /** When the last export was taken, or null for never. Added in version 4. */
  lastBackupAt: string | null;
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
}
