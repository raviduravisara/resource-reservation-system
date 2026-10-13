import { Waves } from "lucide-react";
import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
        <Waves className="size-4.5" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-zinc-900">ResourceHub</span>
    </Link>
  );
}
