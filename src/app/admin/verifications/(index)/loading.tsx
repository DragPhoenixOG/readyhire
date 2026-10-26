import { SkeletonHeader, SkeletonPage, SkeletonTable, SkeletonTabs } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonTabs count={4} />
      <SkeletonTable columns={8} />
    </SkeletonPage>
  );
}
