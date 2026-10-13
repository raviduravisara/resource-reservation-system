"use client";

import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./button";

export function SubmitButton({
  children,
  pending,
  pendingText,
  disabled,
  ...props
}: ComponentProps<typeof Button> & { pending?: boolean; pendingText?: string }) {
  const status = useFormStatus();
  const busy = pending ?? status.pending;
  return (
    <Button type="submit" disabled={busy || disabled} aria-busy={busy} {...props}>
      {busy && <LoaderCircle className="animate-spin" />}
      {busy && pendingText ? pendingText : children}
    </Button>
  );
}
