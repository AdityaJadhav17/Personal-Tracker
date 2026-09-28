import type { Course } from '../domain/types';

interface CourseFilterProps {
  courses: Course[];
  /** The course in force, or null for all of them. */
  value: string | null;
  onChange: (value: string | null) => void;
}

/**
 * Narrow the list to one course. US-27.
 *
 * A select where the category filter is chips, because the two differ in
 * cardinality rather than in kind: the category has three fixed options and
 * fits in a row, while courses are user-created and unbounded, and six chips
 * would not survive the 320px screen US-23 fixed.
 *
 * Renders nothing at all until a course exists, which is AC-27.2 and the same
 * rule the item row already follows: an empty control still takes a tab stop
 * from someone who does not use courses.
 */
export default function CourseFilter({
  courses,
  value,
  onChange,
}: CourseFilterProps) {
  if (courses.length === 0) return null;

  return (
    <select
      className="filter__select"
      // US-78. Not just "Course": the add form beside it has a Course field
      // now, and two controls with one name are one too many to tell apart.
      aria-label="Filter by course"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value || null)}
    >
      <option value="">All courses</option>
      {courses.map((course) => (
        <option key={course.id} value={course.id}>
          {course.name}
        </option>
      ))}
    </select>
  );
}
