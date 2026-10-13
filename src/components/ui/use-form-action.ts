"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import { idle, type ActionState } from "@/lib/action-state";

export function useFormAction(
  action: (state: ActionState, formData: FormData) => Promise<ActionState>,
  { resetOnSuccess = true } = {},
) {
  const [state, dispatch, pending] = useActionState(action, idle);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return { state, pending, formProps: { ref, onSubmit } };
}
