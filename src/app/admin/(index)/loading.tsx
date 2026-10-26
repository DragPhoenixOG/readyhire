import {
  SkeletonCard,
  SkeletonHeader,
  SkeletonList,
  SkeletonPage,
  SkeletonStats,
  SkeletonTable,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonStats count={8} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <SkeletonCard description>
          <SkeletonList rows={5} />
        </SkeletonCard>
        <SkeletonCard description bodyClassName="px-2 py-2">
          <SkeletonTable bare columns={6} rows={3} />
        </SkeletonCard>
      </div>
    </SkeletonPage>
  );
}
