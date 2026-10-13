"use client";

import { useState } from "react";
import { SLOT_MINUTES, type OpeningHours } from "@/lib/booking-rules";
import { displayClock, WEEKDAYS, weekdayOfKey } from "@/lib/time";
import { bookResource } from "@/server/actions/reservations";
import { Alert } from "../ui/alert";
import { Field, Input, Textarea } from "../ui/field";
import { SubmitButton } from "../ui/submit-button";
import { useFormAction } from "../ui/use-form-action";

export function BookingForm({
  resourceId,
  requiresApproval,
  capacity,
  hours,
  defaults,
  minDate,
  maxDate,
}: {
  resourceId: string;
  requiresApproval: boolean;
  capacity: number | null;
  hours: OpeningHours[];
  defaults: { date: string; start: string; end: string };
  minDate: string;
  maxDate: string;
}) {
  const { state, pending, formProps } = useFormAction(bookResource);
  const [date, setDate] = useState(defaults.date);
  const weekday = date ? weekdayOfKey(date) : null;
  const dayHours = weekday === null ? undefined : hours.find((h) => h.weekday === weekday);

  return (
    <form {...formProps} className="grid gap-4">
      <input type="hidden" name="resourceId" value={resourceId} />

      {state.message && (
        <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
      )}

      <Field label="Title" htmlFor="title" error={state.errors?.title}>
        <Input id="title" name="title" placeholder="e.g. Sprint planning" maxLength={120} required />
      </Field>

      <Field
        label="Date"
        htmlFor="date"
        error={state.errors?.date}
        hint={
          weekday === null
            ? undefined
            : dayHours
              ? `Open ${displayClock(dayHours.opensAt)} – ${displayClock(dayHours.closesAt)} on ${WEEKDAYS[weekday]}s`
              : `Closed on ${WEEKDAYS[weekday]}s`
        }
      >
        <Input
          id="date"
          name="date"
          type="date"
          min={minDate}
          max={maxDate}
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start" htmlFor="start" error={state.errors?.start}>
          <Input id="start" name="start" type="time" step={SLOT_MINUTES * 60} defaultValue={defaults.start} required />
        </Field>
        <Field label="End" htmlFor="end" error={state.errors?.end}>
          <Input id="end" name="end" type="time" step={SLOT_MINUTES * 60} defaultValue={defaults.end} required />
        </Field>
      </div>

      <Field
        label="Attendees"
        htmlFor="attendees"
        error={state.errors?.attendees}
        hint={capacity ? `Up to ${capacity} people` : "Optional"}
      >
        <Input id="attendees" name="attendees" type="number" min={1} max={capacity ?? undefined} inputMode="numeric" />
      </Field>

      <Field label="Notes" htmlFor="notes" error={state.errors?.notes} hint="Optional — setup needs, agenda, etc.">
        <Textarea id="notes" name="notes" rows={2} maxLength={1000} />
      </Field>

      {requiresApproval && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          This resource needs admin approval. Your request will hold the slot until it is reviewed.
        </p>
      )}

      <SubmitButton pending={pending} pendingText="Checking availability…">
        {requiresApproval ? "Request booking" : "Book now"}
      </SubmitButton>
    </form>
  );
}
