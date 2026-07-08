import { Star } from 'lucide-react';

export default function RatingStars({ nota, total, size = 18, showText = true }: { nota: number; total?: number; size?: number; showText?: boolean }) {
  const rating = Number.isFinite(nota) ? Math.max(0, Math.min(5, nota)) : 0;
  const rounded = Math.round(rating);

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', gap: 1, color: '#ca8a04' }} aria-label={`Avaliação ${rating.toFixed(1)} de 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} size={size} fill={star <= rounded ? 'currentColor' : 'none'} strokeWidth={2.4} />
        ))}
      </span>
      {showText && (
        <strong style={{ color: '#14532d' }}>
          {total && total > 0 ? `${rating.toFixed(1)} (${total})` : 'Sem avaliações'}
        </strong>
      )}
    </span>
  );
}
