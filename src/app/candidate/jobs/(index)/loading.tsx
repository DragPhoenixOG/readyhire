import { Bone, SkeletonHeader, SkeletonPage, SkeletonSearch } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonSearch inputs={2} />
      <ul className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1.5">
                <Bone className="h-5 w-56" />
                <Bone className="h-4 w-32" />
              </div>
              <Bone className="h-5 w-36 rounded-full" />
            </div>
            <Bone className="mt-3 h-4 w-80 max-w-full" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <Bone className="h-6 w-16 rounded-full" />
                <Bone className="h-6 w-20 rounded-full" />
                <Bone className="h-6 w-14 rounded-full" />
              </div>
              <Bone className="h-3 w-20" />
            </div>
          </li>
        ))}
      </ul>
    </SkeletonPage>
  );
}
