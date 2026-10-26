import { SkeletonHeader, SkeletonPage, SkeletonSearch, SkeletonTable, SkeletonTabs } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SkeletonTabs count={5} className="" />
        <SkeletonSearch inputs={1} className="" />
      </div>
      <SkeletonTable columns={5} />
    </SkeletonPage>
  );
}
