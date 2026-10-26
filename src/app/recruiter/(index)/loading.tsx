import { SkeletonCard, SkeletonHeader, SkeletonList, SkeletonPage, SkeletonStats } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader action />
      <SkeletonStats count={4} />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SkeletonCard description>
          <SkeletonList rows={4} />
        </SkeletonCard>
        <SkeletonCard>
          <SkeletonList rows={4} />
        </SkeletonCard>
      </div>
      <SkeletonCard description className="mt-6">
        <SkeletonList rows={2} />
      </SkeletonCard>
    </SkeletonPage>
  );
}
