import {
  Bone,
  SkeletonCard,
  SkeletonHeader,
  SkeletonLines,
  SkeletonList,
  SkeletonPage,
  SkeletonStats,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonStats count={4} />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SkeletonCard>
          <SkeletonList rows={3} />
        </SkeletonCard>
        <SkeletonCard>
          <SkeletonList rows={3} />
        </SkeletonCard>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <SkeletonCard description className="lg:col-span-2">
          <div className="grid gap-2 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Bone className="size-5 rounded-full" />
                <Bone className="h-4 w-40" />
              </div>
            ))}
          </div>
        </SkeletonCard>
        <SkeletonCard description>
          <SkeletonLines count={3} />
        </SkeletonCard>
      </div>
    </SkeletonPage>
  );
}
