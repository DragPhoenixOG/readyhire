import { DashboardSkeleton, SkeletonListCard } from "@/components/skeletons";

export default function Loading() {
  return (
    <DashboardSkeleton stats={4} action>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SkeletonListCard rows={4} description />
        <SkeletonListCard rows={4} />
      </div>
      <div className="mt-6">
        <SkeletonListCard rows={2} description />
      </div>
    </DashboardSkeleton>
  );
}
