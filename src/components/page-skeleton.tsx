/**
 * Placeholder shown by the dashboards' loading.tsx while a page renders on the server, so a click gets an
 * immediate response instead of the old page staying put until the new one arrives.
 */
export function PageSkeleton() {
  const bar = "rounded bg-slate-200 motion-safe:animate-pulse";
  return (
    <div role="status" aria-label="Loading" className="space-y-6">
      <div className="space-y-2">
        <div className={`${bar} h-7 w-56`} />
        <div className={`${bar} h-4 w-80 max-w-full`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className={`${bar} h-4 w-24`} />
            <div className={`${bar} mt-3 h-7 w-16`} />
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className={`${bar} h-5 w-40`} />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${bar} h-4 w-full`} />
        ))}
      </div>
    </div>
  );
}
