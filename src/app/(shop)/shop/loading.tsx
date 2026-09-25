/** Shown instantly while the product grid loads: same layout as the real page, so nothing jumps. */
export default function ShopLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10" aria-busy="true" aria-label="Loading products">
      <div className="skeleton h-9 w-48" />
      <div className="skeleton mt-3 h-4 w-32" />
      <div className="mt-6 flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-9 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="card-soft overflow-hidden rounded-2xl bg-surface">
            <div className="skeleton aspect-square rounded-none" />
            <div className="grid gap-2 p-4">
              <div className="skeleton h-4 w-4/5" />
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton mt-3 h-6 w-2/5" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
