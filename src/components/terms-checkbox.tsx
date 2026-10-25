import Link from "next/link";

export function TermsCheckbox({ points }: { points: string[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
      <label className="flex gap-3">
        <input type="checkbox" name="terms" required className="mt-0.5 h-4 w-4 accent-brand-700" />
        <span className="text-slate-700">
          I accept the{" "}
          <Link href="/terms" target="_blank" className="font-medium text-brand-700 hover:underline">
            Readyhire terms &amp; platform rules
          </Link>
          , including:
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-600">
            {points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </span>
      </label>
    </div>
  );
}
