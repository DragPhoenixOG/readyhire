import {
  Bone,
  SkeletonButton,
  SkeletonCard,
  SkeletonDescriptionList,
  SkeletonField,
  SkeletonHeader,
  SkeletonLines,
  SkeletonList,
  SkeletonPage,
  SkeletonSignals,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader back badge />
      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,24rem)]">
        <div className="space-y-6">
          <SkeletonCard description>
            <SkeletonDescriptionList items={7} />
          </SkeletonCard>
          <SkeletonCard description>
            <ul className="space-y-5">
              {[0, 1, 2].map((i) => (
                <li key={i} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Bone className="h-5 w-44" />
                    <Bone className="h-5 w-20 rounded-full" />
                  </div>
                  <Bone className="h-40 w-full rounded-lg" />
                </li>
              ))}
            </ul>
          </SkeletonCard>
          <SkeletonCard description>
            <SkeletonList rows={2} />
          </SkeletonCard>
        </div>
        <div className="space-y-6">
          <SkeletonCard>
            <div className="space-y-4">
              <SkeletonLines count={3} />
              <SkeletonField />
              <div className="grid grid-cols-2 gap-3">
                <SkeletonField />
                <SkeletonField />
              </div>
              <SkeletonField textarea />
              <SkeletonButton className="w-48" />
            </div>
          </SkeletonCard>
          <SkeletonCard>
            <SkeletonSignals />
          </SkeletonCard>
        </div>
      </div>
    </SkeletonPage>
  );
}
