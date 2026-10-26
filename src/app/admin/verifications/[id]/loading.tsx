import {
  Bone,
  DetailPageSkeleton,
  SkeletonButton,
  SkeletonCard,
  SkeletonDescriptionList,
  SkeletonField,
  SkeletonLines,
  SkeletonListCard,
  SkeletonSignalsCard,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <DetailPageSkeleton
      badge
      sidebar="24rem"
      main={
        <>
          <SkeletonCard description>
            <SkeletonDescriptionList items={7} />
          </SkeletonCard>
          <SkeletonCard description>
            <ul className="space-y-5">
              {[0, 1, 2].map((i) => (
                <li key={i} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Bone className="h-5 w-44" />
                    <Bone className="h-5 w-20 rounded-full" />
                  </div>
                  <Bone className="h-40 w-full rounded-lg" />
                </li>
              ))}
            </ul>
          </SkeletonCard>
          <SkeletonListCard rows={2} description />
        </>
      }
      side={
        <>
          <SkeletonCard>
            <div className="space-y-4">
              <SkeletonLines count={3} />
              <SkeletonField />
              <div className="grid grid-cols-2 gap-3">
                <SkeletonField />
                <SkeletonField />
              </div>
              <SkeletonField textarea />
              <SkeletonButton className="w-48" />
            </div>
          </SkeletonCard>
          <SkeletonSignalsCard />
        </>
      }
    />
  );
}
