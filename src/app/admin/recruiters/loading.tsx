import { ListPageSkeleton } from "@/components/skeletons";

export default function Loading() {
  return <ListPageSkeleton columns={7} rows={3} rowClassName="py-8" />;
}
