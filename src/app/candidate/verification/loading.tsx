import {
  Bone,
  SkeletonButton,
  SkeletonCard,
  SkeletonField,
  SkeletonHeader,
  SkeletonPage,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader badge />
      <div className="space-y-6">
        <Bone className="h-16 w-full rounded-lg" />
        <SkeletonCard description>
          <div className="grid gap-4 sm:grid-cols-3">
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
          </div>
          <SkeletonButton className="mt-4" />
        </SkeletonCard>
        <SkeletonCard description>
          <ul className="divide-y divide-slate-100">
            {[0, 1, 2].map((i) => (
              <li key={i} className="grid gap-4 py-4 first:pt-0 last:pb-0 md:grid-cols-[1fr_minmax(0,20rem)]">
                <div className="space-y-2">
                  <Bone className="h-5 w-44" />
                  <Bone className="h-4 w-full max-w-md" />
                  <Bone className="h-4 w-48" />
                </div>
                <div className="space-y-2">
                  <Bone className="h-9 w-full rounded-lg" />
                  <Bone className="h-8 w-24 rounded-lg" />
                </div>
              </li>
            ))}
          </ul>
        </SkeletonCard>
        <SkeletonCard description>
          <SkeletonButton className="w-48" />
        </SkeletonCard>
      </div>
    </SkeletonPage>
  );
}
