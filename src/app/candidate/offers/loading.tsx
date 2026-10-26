import {
  Bone,
  SkeletonButton,
  SkeletonCard,
  SkeletonField,
  SkeletonHeader,
  SkeletonPage,
  SkeletonStats,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonStats count={3} className="sm:grid-cols-3" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <SkeletonCard key={i} description>
              <div className="grid gap-4 md:grid-cols-[1fr_minmax(0,16rem)]">
                <div className="grid gap-3 sm:grid-cols-2">
                  <SkeletonField />
                  <SkeletonField />
                </div>
                <div className="space-y-2">
                  <Bone className="h-9 w-full rounded-lg" />
                  <Bone className="h-8 w-24 rounded-lg" />
                </div>
              </div>
            </SkeletonCard>
          ))}
        </div>
        <SkeletonCard>
          <div className="space-y-4">
            <SkeletonField />
            <SkeletonField />
            <div className="grid grid-cols-2 gap-3">
              <SkeletonField />
              <SkeletonField />
              <SkeletonField />
              <SkeletonField />
            </div>
            <SkeletonButton className="w-28" />
          </div>
        </SkeletonCard>
      </div>
    </SkeletonPage>
  );
}
