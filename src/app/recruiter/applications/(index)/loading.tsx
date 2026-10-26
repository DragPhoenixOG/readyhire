import { SkeletonHeader, SkeletonPage, SkeletonTable, SkeletonTabs } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonTabs count={5} />
      <SkeletonTable columns={7} />
    </SkeletonPage>
  );
}
