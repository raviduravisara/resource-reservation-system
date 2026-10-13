"use client";

import { addMaintenance } from "@/server/actions/resources";
import { Alert } from "../ui/alert";
import { Field, Input } from "../ui/field";
import { SubmitButton } from "../ui/submit-button";
import { useFormAction } from "../ui/use-form-action";

export function MaintenanceForm({ resourceId, today }: { resourceId: string; today: string }) {
  const { state, pending, formProps } = useFormAction(addMaintenance);

  return (
    <form {...formProps} className="grid gap-3">
      <input type="hidden" name="resourceId" value={resourceId} />
      {state.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts" htmlFor="startDate" error={state.errors?.startDate ?? state.errors?.startTime}>
          <Input id="startDate" name="startDate" type="date" min={today} defaultValue={today} required />
          <Input name="startTime" type="time" step={900} defaultValue="08:00" aria-label="Start time" required />
        </Field>
        <Field label="Ends" htmlFor="endDate" error={state.errors?.endDate ?? state.errors?.endTime}>
          <Input id="endDate" name="endDate" type="date" min={today} defaultValue={today} required />
          <Input name="endTime" type="time" step={900} defaultValue="12:00" aria-label="End time" required />
        </Field>
      </div>
      <Field label="Reason" htmlFor="reason" error={state.errors?.reason}>
        <Input id="reason" name="reason" placeholder="e.g. Projector replacement" maxLength={200} required />
      </Field>
      <p className="text-xs text-zinc-500">
        Any pending or confirmed bookings in this window are cancelled automatically and the bookers see the reason.
      </p>
      <SubmitButton pending={pending} variant="secondary" pendingText="Scheduling…">
        Schedule maintenance
      </SubmitButton>
    </form>
  );
}
