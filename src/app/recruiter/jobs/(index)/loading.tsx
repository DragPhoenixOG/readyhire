import { SkeletonHeader, SkeletonPage, SkeletonTable } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader action />
      <SkeletonTable columns={7} />
    </SkeletonPage>
  );
}
