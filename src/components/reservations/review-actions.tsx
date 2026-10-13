"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { approveBooking, rejectBooking } from "@/server/actions/reservations";
import { ActionButton } from "../ui/action-button";
import { Button } from "../ui/button";
import { Input } from "../ui/field";
import { SubmitButton } from "../ui/submit-button";
import { useFormAction } from "../ui/use-form-action";

export function ReviewActions({ id }: { id: string }) {
  const [rejecting, setRejecting] = useState(false);
  const { state, pending, formProps } = useFormAction(rejectBooking);

  if (rejecting) {
    return (
      <form {...formProps} className="flex w-full flex-col gap-2 sm:w-80">
        <input type="hidden" name="id" value={id} />
        <Input name="reason" placeholder="Reason for rejecting" maxLength={300} autoFocus required />
        {state.ok === false && (
          <p className="text-xs text-red-600">{state.errors?.reason?.[0] ?? state.message}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setRejecting(false)}>
            Back
          </Button>
          <SubmitButton pending={pending} variant="danger" size="sm">
            Reject request
          </SubmitButton>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <Button variant="secondary" size="sm" onClick={() => setRejecting(true)}>
        <X />
        Reject
      </Button>
      <ActionButton action={approveBooking} fields={{ id }} variant="primary">
        <Check />
        Approve
      </ActionButton>
    </div>
  );
}
