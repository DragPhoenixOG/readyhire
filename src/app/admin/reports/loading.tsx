import { Bone, SkeletonCard, SkeletonField, SkeletonHeader, SkeletonLines, SkeletonPage } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <SkeletonCard key={i} description>
            <div className="grid gap-4 md:grid-cols-2">
              <SkeletonLines count={4} />
              <div className="space-y-3">
                <div className="flex gap-4">
                  <Bone className="h-4 w-20" />
                  <Bone className="h-4 w-20" />
                </div>
                <SkeletonField textarea />
                <Bone className="h-8 w-24 rounded-lg" />
              </div>
            </div>
          </SkeletonCard>
        ))}
      </div>
    </SkeletonPage>
  );
}
