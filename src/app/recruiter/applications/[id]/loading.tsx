import {
  Bone,
  DetailPageSkeleton,
  SkeletonButton,
  SkeletonCard,
  SkeletonChips,
  SkeletonField,
  SkeletonLines,
  SkeletonListCard,
  SkeletonSignalsCard,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <DetailPageSkeleton
      badge
      main={
        <>
          <SkeletonCard description>
            <div className="space-y-4">
              <Bone className="h-10 w-full rounded-lg" />
              <SkeletonField textarea />
              <SkeletonButton className="w-44" />
            </div>
          </SkeletonCard>
          <SkeletonListCard rows={2} />
          <SkeletonListCard rows={4} />
        </>
      }
      side={
        <>
          <SkeletonSignalsCard />
          <SkeletonCard>
            <div className="space-y-3">
              <Bone className="h-4 w-48" />
              <SkeletonLines count={2} />
              <SkeletonChips />
            </div>
          </SkeletonCard>
        </>
      }
    />
  );
}
