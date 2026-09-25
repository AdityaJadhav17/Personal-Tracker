/**
 * US-60. A card's More control: the three dots that reveal what a card you
 * are only reading should not show, Delete for now. Shared by the course and
 * goal cards, which is why it is a component and not a copied button.
 */
export default function MoreButton({
  name,
  open,
  onToggle,
}: {
  name: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className="card__more"
      type="button"
      aria-label={`More for ${name}`}
      aria-expanded={open}
      onClick={onToggle}
    >
      <span aria-hidden="true">⋯</span>
    </button>
  );
}
