import {
  Bone,
  SkeletonButton,
  SkeletonCard,
  SkeletonField,
  SkeletonHeader,
  SkeletonPage,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonCard title={false} className="max-w-3xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonField />
          <SkeletonField />
          <SkeletonField className="sm:col-span-2" />
          <SkeletonField />
          <SkeletonField />
          <SkeletonField />
          <SkeletonField />
          <SkeletonField className="sm:col-span-2" />
          <SkeletonField />
        </div>
        <SkeletonButton className="mt-4 w-32" />
      </SkeletonCard>
      <SkeletonCard description className="mt-6 max-w-3xl">
        <div className="grid gap-4 md:grid-cols-[1fr_minmax(0,20rem)]">
          <Bone className="h-4 w-48" />
          <div className="space-y-2">
            <Bone className="h-9 w-full rounded-lg" />
            <Bone className="h-8 w-32 rounded-lg" />
          </div>
        </div>
      </SkeletonCard>
    </SkeletonPage>
  );
}
