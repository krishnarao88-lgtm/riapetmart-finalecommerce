/** Product page placeholder: photo, title, chips and the buy box in their real positions. */
export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10" aria-busy="true" aria-label="Loading product">
      <div className="skeleton h-4 w-64" />
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="skeleton mx-auto aspect-square w-full max-h-[45vh] rounded-3xl sm:max-h-none" />
        <div className="grid content-start gap-4">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-9 w-4/5" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="skeleton h-8 w-24 rounded-full" />
            ))}
          </div>
          <div className="card-soft grid gap-3 rounded-2xl bg-surface p-5">
            <div className="skeleton h-10 w-2/3" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-12 w-full rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
