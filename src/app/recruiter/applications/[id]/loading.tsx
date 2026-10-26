import {
  Bone,
  SkeletonButton,
  SkeletonCard,
  SkeletonField,
  SkeletonHeader,
  SkeletonLines,
  SkeletonList,
  SkeletonPage,
  SkeletonSignals,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader back badge />
      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <div className="space-y-6">
          <SkeletonCard description>
            <div className="space-y-4">
              <Bone className="h-10 w-full rounded-lg" />
              <SkeletonField textarea />
              <SkeletonButton className="w-44" />
            </div>
          </SkeletonCard>
          <SkeletonCard>
            <SkeletonList rows={2} />
          </SkeletonCard>
          <SkeletonCard>
            <SkeletonList rows={4} />
          </SkeletonCard>
        </div>
        <div className="space-y-6">
          <SkeletonCard>
            <SkeletonSignals />
          </SkeletonCard>
          <SkeletonCard>
            <div className="space-y-3">
              <Bone className="h-4 w-48" />
              <SkeletonLines count={2} />
              <div className="flex gap-2">
                <Bone className="h-6 w-16 rounded-full" />
                <Bone className="h-6 w-20 rounded-full" />
              </div>
            </div>
          </SkeletonCard>
        </div>
      </div>
    </SkeletonPage>
  );
}
