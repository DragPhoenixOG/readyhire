import {
  SkeletonCard,
  SkeletonHeader,
  SkeletonJobMeta,
  SkeletonLines,
  SkeletonPage,
  SkeletonTable,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader back badge action />
      <div className="space-y-6">
        <SkeletonCard bodyClassName="px-2 py-2">
          <SkeletonTable bare columns={6} rows={2} />
        </SkeletonCard>
        <SkeletonCard>
          <div className="space-y-4">
            <SkeletonJobMeta />
            <SkeletonLines count={6} />
          </div>
        </SkeletonCard>
      </div>
    </SkeletonPage>
  );
}
