"use client";

import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFormAction } from "@/components/ui/use-form-action";
import { login } from "@/server/actions/auth";

export function LoginForm() {
  const { state, pending, formProps } = useFormAction(login, { resetOnSuccess: false });
  const next = useSearchParams().get("next") ?? "";

  return (
    <form {...formProps} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      {state.ok === false && !state.errors && <Alert tone="error">{state.message}</Alert>}
      <Field label="Email" htmlFor="email" error={state.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <Field label="Password" htmlFor="password" error={state.errors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton pending={pending} className="mt-2 w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
