import {
  DetailPageSkeleton,
  SkeletonCard,
  SkeletonChips,
  SkeletonDescriptionList,
  SkeletonListCard,
  SkeletonSignalsCard,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <DetailPageSkeleton
      main={
        <>
          <SkeletonCard>
            <SkeletonDescriptionList items={5} />
            <div className="mt-4">
              <SkeletonChips />
            </div>
          </SkeletonCard>
          <SkeletonListCard rows={2} />
        </>
      }
      side={<SkeletonSignalsCard />}
    />
  );
}
