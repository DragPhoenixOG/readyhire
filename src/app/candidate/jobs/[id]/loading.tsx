import {
  DetailPageSkeleton,
  SkeletonButton,
  SkeletonCard,
  SkeletonField,
  SkeletonJobMeta,
  SkeletonLines,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <DetailPageSkeleton
      main={
        <SkeletonCard title={false}>
          <div className="space-y-4">
            <SkeletonJobMeta />
            <SkeletonLines count={8} />
          </div>
        </SkeletonCard>
      }
      side={
        <>
          <SkeletonCard>
            <div className="space-y-4">
              <SkeletonLines count={3} />
              <SkeletonField textarea />
              <SkeletonButton className="w-52" />
            </div>
          </SkeletonCard>
          <SkeletonLines count={2} />
        </>
      }
    />
  );
}
