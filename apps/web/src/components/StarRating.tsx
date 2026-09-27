interface StarRatingProps {
  rating: number
  reviewCount?: number
  size?: 'sm' | 'md'
}

export function StarRating({ rating, reviewCount, size = 'sm' }: StarRatingProps) {
  const starSize = size === 'sm' ? 'text-xs' : 'text-base'
  const stars = Array.from({ length: 5 }, (_, i) => {
    const filled = i + 1 <= Math.round(rating)
    return (
      <span key={i} className={filled ? 'text-amber-400' : 'text-slate-200'}>
        ★
      </span>
    )
  })

  return (
    <div className={`flex items-center gap-1 ${starSize}`}>
      <span className="flex">{stars}</span>
      <span className="font-medium text-slate-700">{rating.toFixed(1)}</span>
      {typeof reviewCount === 'number' && (
        <span className="text-slate-400">({reviewCount})</span>
      )}
    </div>
  )
}
