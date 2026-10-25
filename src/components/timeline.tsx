import { eventLabel } from "@/lib/events";
import { formatDateTime } from "@/lib/format";

type TimelineEvent = {
  id: string;
  type: string;
  message: string | null;
  createdAt: Date;
  actor: { name: string; role: string } | null;
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-slate-500">No activity yet.</p>;
  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute top-1.5 -left-[1.6rem] h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-600 ring-1 ring-brand-200" />
          <p className="text-sm font-medium text-slate-900">{eventLabel(e.type)}</p>
          <p className="text-xs text-slate-500">
            {formatDateTime(e.createdAt)}
            {e.actor && ` · ${e.actor.name} (${e.actor.role.toLowerCase()})`}
          </p>
          {e.message && <p className="mt-1 text-sm whitespace-pre-line text-slate-700">{e.message}</p>}
        </li>
      ))}
    </ol>
  );
}
