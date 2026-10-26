import { Bone, SkeletonChips, SkeletonHeader, SkeletonPage, SkeletonSearch } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonSearch inputs={4} />
      <ul className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5">
                <Bone className="h-5 w-40" />
                <Bone className="h-4 w-56 max-w-full" />
                <Bone className="h-4 w-64 max-w-full" />
              </div>
              <Bone className="h-5 w-20 rounded-full" />
            </div>
            <Bone className="mt-3 h-12 w-full rounded-lg" />
            <div className="mt-3 flex gap-2">
              <Bone className="h-5 w-24 rounded-full" />
              <Bone className="h-5 w-24 rounded-full" />
            </div>
            <div className="mt-3">
              <SkeletonChips />
            </div>
          </li>
        ))}
      </ul>
    </SkeletonPage>
  );
}
