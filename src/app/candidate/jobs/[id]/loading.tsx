import {
  SkeletonButton,
  SkeletonCard,
  SkeletonField,
  SkeletonHeader,
  SkeletonJobMeta,
  SkeletonLines,
  SkeletonPage,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader back />
      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <SkeletonCard title={false}>
          <div className="space-y-4">
            <SkeletonJobMeta />
            <SkeletonLines count={8} />
          </div>
        </SkeletonCard>
        <div className="space-y-4">
          <SkeletonCard>
            <div className="space-y-4">
              <SkeletonLines count={3} />
              <SkeletonField textarea />
              <SkeletonButton className="w-52" />
            </div>
          </SkeletonCard>
          <SkeletonLines count={2} />
        </div>
      </div>
    </SkeletonPage>
  );
}
