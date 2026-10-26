import { ListPageSkeleton } from "@/components/skeletons";

export default function Loading() {
  return <ListPageSkeleton columns={5} tabs={5} search={1} />;
}
