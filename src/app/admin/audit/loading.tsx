import { SkeletonHeader, SkeletonPage, SkeletonTable } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonTable columns={5} rows={10} />
    </SkeletonPage>
  );
}
