import { DashboardSkeleton, SkeletonCard, SkeletonListCard, SkeletonTable } from "@/components/skeletons";

export default function Loading() {
  return (
    <DashboardSkeleton stats={8}>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <SkeletonListCard rows={5} description />
        <SkeletonCard description bodyClassName="px-2 py-2">
          <SkeletonTable bare columns={6} rows={3} />
        </SkeletonCard>
      </div>
    </DashboardSkeleton>
  );
}
