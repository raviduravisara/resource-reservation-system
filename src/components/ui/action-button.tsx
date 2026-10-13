"use client";

import { useActionState, type ReactNode } from "react";
import { idle, type ActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils";
import type { ButtonSize, ButtonVariant } from "./button";
import { SubmitButton } from "./submit-button";

export function ActionButton({
  action,
  fields,
  confirm,
  variant = "secondary",
  size = "sm",
  title,
  className,
  children,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  confirm?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  const [state, formAction] = useActionState(action, idle);

  return (
    <form
      action={formAction}
      className={cn("inline-flex flex-col items-end gap-1", className)}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton variant={variant} size={size} title={title}>
        {children}
      </SubmitButton>
      {state.ok === false && state.message && (
        <p role="alert" className="max-w-56 text-right text-xs text-red-600">
          {state.message}
        </p>
      )}
    </form>
  );
}
