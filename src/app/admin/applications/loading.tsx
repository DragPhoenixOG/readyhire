import { SkeletonHeader, SkeletonPage, SkeletonTable, SkeletonTabs } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonTabs count={9} />
      <SkeletonTable columns={7} />
    </SkeletonPage>
  );
}
