import { Field, inputClass } from "@/components/ui";
import { INTERVIEW_MODE_LABEL, READYHIRE_ROOMS } from "@/lib/constants";

/**
 * Round, duration, mode, place and notes: shared by "Schedule at a fixed time" and "Offer interview times".
 * `prefix` keeps field ids unique when both forms are on the page.
 */
export function InterviewDetailsFields({ prefix, children }: { prefix: string; children?: React.ReactNode }) {
  const id = (name: string) => `${prefix}-${name}`;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Round" htmlFor={id("round")}>
          <input id={id("round")} name="round" required placeholder="Technical round 1" className={inputClass} />
        </Field>
        <Field label="Duration (minutes)" htmlFor={id("durationMins")}>
          <input
            id={id("durationMins")}
            name="durationMins"
            type="number"
            min={15}
            max={480}
            defaultValue={45}
            required
            className={inputClass}
          />
        </Field>
        {children}
        <Field label="Mode" htmlFor={id("mode")}>
          <select id={id("mode")} name="mode" defaultValue="VIDEO" className={inputClass}>
            {Object.entries(INTERVIEW_MODE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Meeting link or address" htmlFor={id("location")} hint="For video, phone or office interviews.">
          <input id={id("location")} name="location" className={inputClass} />
        </Field>
        <Field
          label="Readyhire room"
          htmlFor={id("room")}
          hint="Controlled room near the candidate — reduces malpractice."
        >
          <select id={id("room")} name="room" defaultValue="" className={inputClass}>
            <option value="">Not using a room</option>
            {READYHIRE_ROOMS.map((room) => (
              <option key={room}>{room}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Notes for the candidate" htmlFor={id("notes")}>
        <textarea id={id("notes")} name="notes" rows={2} className={inputClass} />
      </Field>
    </>
  );
}
