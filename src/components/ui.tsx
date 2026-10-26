import Link from "next/link";
import type { ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export function buttonClass(variant: ButtonVariant = "primary", size: "sm" | "md" = "md") {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-60",
    size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm",
    variant === "primary" && "bg-brand-700 text-white hover:bg-brand-800",
    variant === "secondary" && "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
    variant === "danger" && "bg-rose-600 text-white hover:bg-rose-700",
    variant === "ghost" && "text-slate-700 hover:bg-slate-100",
  );
}

const inputBase =
  "block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 disabled:bg-slate-100 disabled:text-slate-500";

export const inputClass = `${inputBase} w-full`;

/** For inputs sized by their content or an explicit width, e.g. filter bars. */
export const inlineInputClass = inputBase;

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cx("rounded-xl border border-slate-200 bg-white shadow-xs", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      {children !== undefined && <div className={cx("px-5 py-4", bodyClassName)}>{children}</div>}
    </section>
  );
}

export type Tone = "neutral" | "green" | "amber" | "red" | "blue" | "violet";

const toneClass: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  blue: "bg-sky-50 text-sky-800 ring-sky-200",
  violet: "bg-violet-50 text-violet-800 ring-violet-200",
};

export function Badge({
  tone = "neutral",
  wrap,
  children,
}: {
  tone?: Tone;
  /** Let long text wrap instead of keeping the badge on one line. */
  wrap?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        wrap ? "rounded-lg" : "whitespace-nowrap",
        toneClass[tone],
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="mb-2 inline-block text-sm text-slate-500 hover:text-slate-800">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  href?: string;
}) {
  const accent: Record<Tone, string> = {
    neutral: "text-slate-900",
    green: "text-emerald-700",
    amber: "text-amber-700",
    red: "text-rose-700",
    blue: "text-sky-700",
    violet: "text-violet-700",
  };
  const body = (
    <>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={cx("mt-1 text-2xl font-semibold", accent[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </>
  );
  const className = "block rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs";
  return href ? (
    <Link href={href} className={cx(className, "transition-colors hover:border-brand-300 hover:bg-brand-50/40")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <p className="font-medium text-slate-800">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Notice({
  tone = "blue",
  title,
  children,
  action,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const styles: Record<Tone, string> = {
    neutral: "border-slate-200 bg-slate-50 text-slate-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-rose-200 bg-rose-50 text-rose-900",
    blue: "border-sky-200 bg-sky-50 text-sky-900",
    violet: "border-violet-200 bg-violet-50 text-violet-900",
  };
  return (
    <div
      className={cx(
        "flex flex-wrap items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
        styles[tone],
      )}
    >
      <div className="min-w-0 space-y-0.5">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="opacity-90">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function DescriptionList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{item.label}</dt>
          <dd className="mt-0.5 text-sm text-slate-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={i}
                scope="col"
                className="px-3 py-2 text-left text-xs font-medium tracking-wide whitespace-nowrap text-slate-500 uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cx("px-3 py-2.5 align-top text-slate-700", className)}>{children}</td>;
}

export const fileInputClass =
  "block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200";

export function Chips({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
          {item}
        </li>
      ))}
    </ul>
  );
}
