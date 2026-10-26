import { SkeletonHeader, SkeletonPage, SkeletonTable } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonTable columns={7} rows={3} rowClassName="py-8" />
    </SkeletonPage>
  );
}
