import type { ReactNode } from "react";
import { cx } from "@/components/ui";

// Loading placeholders that mirror the real building blocks (PageHeader, StatCard, Card, Table, Field, …) so each
// page's loading.tsx can sketch that page's own layout while it renders on the server.

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export function Bone({ className }: { className?: string }) {
  return <div className={cx("rounded bg-slate-200 motion-safe:animate-pulse", className)} />;
}

export function SkeletonPage({ children }: { children: ReactNode }) {
  return (
    <div role="status" aria-label="Loading">
      {children}
    </div>
  );
}

export function SkeletonHeader({ back, action, badge }: { back?: boolean; action?: boolean; badge?: boolean }) {
  return (
    <div className="mb-6">
      {back && <Bone className="mb-3 h-4 w-28" />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Bone className="h-7 w-56" />
          <Bone className="h-4 w-80 max-w-full" />
        </div>
        {(action || badge) && (
          <div className="flex items-center gap-2">
            {badge && <Bone className="h-5 w-20 rounded-full" />}
            {action && <Bone className="h-9 w-28 rounded-lg" />}
          </div>
        )}
      </div>
    </div>
  );
}

export function SkeletonStats({
  count,
  className = "sm:grid-cols-2 lg:grid-cols-4",
}: {
  count: number;
  className?: string;
}) {
  return (
    <div className={cx("grid gap-4", className)}>
      {range(count).map((i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
          <Bone className="h-4 w-28" />
          <Bone className="mt-2 h-7 w-12" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({
  title = true,
  description,
  className,
  bodyClassName,
  children,
}: {
  title?: boolean;
  description?: boolean;
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
}) {
  return (
    <section className={cx("rounded-xl border border-slate-200 bg-white shadow-xs", className)}>
      {title && (
        <div className="space-y-2 border-b border-slate-100 px-5 py-4">
          <Bone className="h-5 w-40" />
          {description && <Bone className="h-4 w-64 max-w-full" />}
        </div>
      )}
      {children !== undefined && <div className={cx("px-5 py-4", bodyClassName)}>{children}</div>}
    </section>
  );
}

export function SkeletonLines({ count = 3 }: { count?: number }) {
  const widths = ["w-full", "w-11/12", "w-4/5", "w-2/3"];
  return (
    <div className="space-y-2">
      {range(count).map((i) => (
        <Bone key={i} className={cx("h-4", widths[i % widths.length])} />
      ))}
    </div>
  );
}

/** Rows of a divided list: a two-line label on the left and a badge on the right. */
export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-slate-100">
      {range(rows).map((i) => (
        <li key={i} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Bone className="h-4 w-40 max-w-full" />
            <Bone className="h-3 w-56 max-w-full" />
          </div>
          <Bone className="h-5 w-20 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

/** The status filter pills above list pages. */
export function SkeletonTabs({ count, className = "mb-4" }: { count: number; className?: string }) {
  return (
    <div className={cx("flex flex-wrap gap-2", className)}>
      {range(count).map((i) => (
        <Bone key={i} className="h-8 w-24 rounded-full" />
      ))}
    </div>
  );
}

/** A search form: some inputs followed by a button. */
export function SkeletonSearch({ inputs, className = "mb-6" }: { inputs: number; className?: string }) {
  return (
    <div className={cx("flex flex-wrap gap-2", className)}>
      {range(inputs).map((i) => (
        <Bone key={i} className={cx("h-10 rounded-lg", i === 0 ? "w-full sm:w-72" : "w-36")} />
      ))}
      <Bone className="h-10 w-24 rounded-lg" />
    </div>
  );
}

/**
 * A table with the same column count as the real one. It comes in its own card unless `bare` is set, for tables
 * that sit inside a titled card.
 */
export function SkeletonTable({
  columns,
  rows = 6,
  rowClassName = "py-3",
  bare,
}: {
  columns: number;
  rows?: number;
  rowClassName?: string;
  bare?: boolean;
}) {
  const grid = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };
  const table = (
    <>
      <div className="grid gap-4 px-3 py-2.5" style={grid}>
        {range(columns).map((i) => (
          <Bone key={i} className="h-3 w-16 max-w-full" />
        ))}
      </div>
      <div className="divide-y divide-slate-100 border-t border-slate-200">
        {range(rows).map((r) => (
          <div key={r} className={cx("grid gap-4 px-3", rowClassName)} style={grid}>
            {range(columns).map((c) => (
              <Bone key={c} className={cx("h-4 max-w-full", c === 0 ? "w-32" : "w-20")} />
            ))}
          </div>
        ))}
      </div>
    </>
  );
  if (bare) return table;
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white px-2 py-2 shadow-xs">
      {table}
    </section>
  );
}

export function SkeletonField({ textarea, className }: { textarea?: boolean; className?: string }) {
  return (
    <div className={cx("space-y-1.5", className)}>
      <Bone className="h-4 w-28" />
      <Bone className={cx("w-full rounded-lg", textarea ? "h-24" : "h-10")} />
    </div>
  );
}

export function SkeletonButton({ className }: { className?: string }) {
  return <Bone className={cx("h-10 w-36 rounded-lg", className)} />;
}

/** Labelled values, laid out like DescriptionList. */
export function SkeletonDescriptionList({ items }: { items: number }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {range(items).map((i) => (
        <div key={i} className="space-y-1.5">
          <Bone className="h-3 w-20" />
          <Bone className="h-4 w-32" />
        </div>
      ))}
    </div>
  );
}

/** The candidate signals panel: the verification notice, then label/value rows. */
export function SkeletonSignals() {
  return (
    <div className="space-y-4">
      <Bone className="h-16 w-full rounded-lg" />
      <div className="space-y-3">
        {range(7).map((i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <Bone className="h-4 w-28" />
            <Bone className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A job's meta line and skill chips, as on the job pages. */
export function SkeletonJobMeta() {
  return (
    <div className="space-y-3">
      <Bone className="h-4 w-80 max-w-full" />
      <SkeletonChips />
    </div>
  );
}

export function SkeletonChips() {
  return (
    <div className="flex gap-2">
      <Bone className="h-6 w-16 rounded-full" />
      <Bone className="h-6 w-20 rounded-full" />
      <Bone className="h-6 w-14 rounded-full" />
    </div>
  );
}

/** The shared Account page (AccountSettings). */
export function SkeletonAccount() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <div className="grid max-w-4xl items-start gap-6 lg:grid-cols-2">
        <SkeletonCard>
          <SkeletonDescriptionList items={4} />
        </SkeletonCard>
        <SkeletonCard description>
          <div className="space-y-4">
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
            <SkeletonButton />
          </div>
        </SkeletonCard>
        <SkeletonCard description>
          <SkeletonButton className="w-44" />
        </SkeletonCard>
      </div>
    </SkeletonPage>
  );
}
