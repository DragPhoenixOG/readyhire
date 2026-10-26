import { SkeletonButton, SkeletonCard, SkeletonField, SkeletonHeader, SkeletonPage } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader back />
      <SkeletonCard title={false} className="max-w-3xl">
        <div className="space-y-4">
          <SkeletonField />
          <SkeletonField textarea />
          <div className="grid gap-4 sm:grid-cols-2">
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
          </div>
          <SkeletonField />
          <SkeletonButton className="w-32" />
        </div>
      </SkeletonCard>
    </SkeletonPage>
  );
}
