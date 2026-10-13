import { CircleAlert, CircleCheck, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  success: { className: "border-brand-200 bg-brand-50 text-brand-900", Icon: CircleCheck },
  error: { className: "border-red-200 bg-red-50 text-red-800", Icon: CircleAlert },
  info: { className: "border-sky-200 bg-sky-50 text-sky-900", Icon: Info },
};

export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
  className?: string;
}) {
  const { className: toneClass, Icon } = tones[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm", toneClass, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
