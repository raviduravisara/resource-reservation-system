"use client";

import { addCategory } from "@/server/actions/resources";
import { Alert } from "../ui/alert";
import { Field, Input } from "../ui/field";
import { SubmitButton } from "../ui/submit-button";
import { useFormAction } from "../ui/use-form-action";

export function CategoryForm() {
  const { state, pending, formProps } = useFormAction(addCategory);

  return (
    <form {...formProps} className="grid gap-3">
      {state.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}
      <Field label="Name" htmlFor="name" error={state.errors?.name}>
        <Input id="name" name="name" placeholder="e.g. Sports facilities" maxLength={80} required />
      </Field>
      <Field label="Description" htmlFor="description" error={state.errors?.description}>
        <Input id="description" name="description" placeholder="Optional" maxLength={300} />
      </Field>
      <SubmitButton pending={pending} pendingText="Adding…">
        Add category
      </SubmitButton>
    </form>
  );
}
