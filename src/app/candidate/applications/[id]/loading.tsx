import {
  Bone,
  SkeletonButton,
  SkeletonCard,
  SkeletonHeader,
  SkeletonLines,
  SkeletonList,
  SkeletonPage,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader back badge />
      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <div className="space-y-6">
          <SkeletonCard>
            <Bone className="h-20 w-full rounded-lg" />
          </SkeletonCard>
          <SkeletonCard>
            <SkeletonList rows={2} />
          </SkeletonCard>
          <SkeletonCard>
            <SkeletonList rows={4} />
          </SkeletonCard>
        </div>
        <div className="space-y-6">
          <SkeletonCard description>
            <div className="space-y-3">
              <SkeletonLines count={2} />
              <SkeletonButton />
            </div>
          </SkeletonCard>
          <SkeletonCard>
            <SkeletonLines count={3} />
          </SkeletonCard>
        </div>
      </div>
    </SkeletonPage>
  );
}
