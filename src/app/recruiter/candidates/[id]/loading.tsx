import {
  SkeletonCard,
  SkeletonChips,
  SkeletonDescriptionList,
  SkeletonHeader,
  SkeletonList,
  SkeletonPage,
  SkeletonSignals,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader back />
      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <div className="space-y-6">
          <SkeletonCard>
            <SkeletonDescriptionList items={5} />
            <div className="mt-4">
              <SkeletonChips />
            </div>
          </SkeletonCard>
          <SkeletonCard>
            <SkeletonList rows={2} />
          </SkeletonCard>
        </div>
        <SkeletonCard>
          <SkeletonSignals />
        </SkeletonCard>
      </div>
    </SkeletonPage>
  );
}
