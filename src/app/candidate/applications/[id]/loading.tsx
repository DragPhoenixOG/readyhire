import {
  Bone,
  DetailPageSkeleton,
  SkeletonButton,
  SkeletonCard,
  SkeletonLines,
  SkeletonListCard,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <DetailPageSkeleton
      badge
      main={
        <>
          <SkeletonCard>
            <Bone className="h-20 w-full rounded-lg" />
          </SkeletonCard>
          <SkeletonListCard rows={2} />
          <SkeletonListCard rows={4} />
        </>
      }
      side={
        <>
          <SkeletonCard description>
            <div className="space-y-3">
              <SkeletonLines count={2} />
              <SkeletonButton />
            </div>
          </SkeletonCard>
          <SkeletonCard>
            <SkeletonLines count={3} />
          </SkeletonCard>
        </>
      }
    />
  );
}
