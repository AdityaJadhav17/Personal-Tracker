interface EmptyStateProps {
  /** Moves focus to the Title field, so the keyboard path starts here. */
  onAddFirst: () => void;
}

export default function EmptyState({ onAddFirst }: EmptyStateProps) {
  return (
    <section className="empty">
      <p>Nothing due yet.</p>
      <p>
        Anything with a date belongs here: rent, a midterm, a dentist
        appointment, a friend&rsquo;s birthday.
      </p>
      <button className="empty__action" type="button" onClick={onAddFirst}>
        Add your first item
      </button>
    </section>
  );
}
