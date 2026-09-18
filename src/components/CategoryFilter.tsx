import type { Category } from '../domain/types';

/** Everything, or one category. */
export type Filter = 'all' | Category;

const OPTIONS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'academic', label: 'Academic' },
  { value: 'personal', label: 'Personal' },
];

interface CategoryFilterProps {
  value: Filter;
  onChange: (value: Filter) => void;
}

/**
 * Narrow the list to one category. US-08.
 *
 * Buttons carrying `aria-pressed` rather than a select, matching the score
 * control on Reflections: one click instead of two, and the choice in force is
 * visible without opening anything.
 *
 * Deliberately not stored. AC-08.2 wants a reload to show everything again,
 * which plain component state gives for free, and it is the right default: a
 * filter you forgot you set is a list that is lying to you.
 */
export default function CategoryFilter({
  value,
  onChange,
}: CategoryFilterProps) {
  return (
    <div className="filter" role="group" aria-label="Show">
      {OPTIONS.map((option) => (
        <button
          className={`filter__option ${
            value === option.value ? 'filter__option--current' : ''
          }`}
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
