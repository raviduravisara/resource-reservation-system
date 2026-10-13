"use client";

import { addUser } from "@/server/actions/users";
import { Alert } from "../ui/alert";
import { Field, Input, Select } from "../ui/field";
import { SubmitButton } from "../ui/submit-button";
import { useFormAction } from "../ui/use-form-action";

export function UserForm() {
  const { state, pending, formProps } = useFormAction(addUser);

  return (
    <form {...formProps} className="grid gap-3">
      {state.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}
      <Field label="Full name" htmlFor="name" error={state.errors?.name}>
        <Input id="name" name="name" maxLength={120} required />
      </Field>
      <Field label="Email" htmlFor="email" error={state.errors?.email}>
        <Input id="email" name="email" type="email" required />
      </Field>
      <Field
        label="Temporary password"
        htmlFor="password"
        error={state.errors?.password}
        hint="At least 8 characters. Share it with the user privately."
      >
        <Input id="password" name="password" type="text" minLength={8} autoComplete="off" required />
      </Field>
      <Field label="Role" htmlFor="role" error={state.errors?.role}>
        <Select id="role" name="role" defaultValue="member">
          <option value="member">Member — can book resources</option>
          <option value="admin">Admin — manages resources and approvals</option>
        </Select>
      </Field>
      <SubmitButton pending={pending} pendingText="Creating…">
        Create user
      </SubmitButton>
    </form>
  );
}
